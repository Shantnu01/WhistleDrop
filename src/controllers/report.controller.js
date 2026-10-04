const db = require('../config/db');
const { redisClient } = require('../config/redis');
const CryptoService = require('../services/crypto.service');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const invalidateReportsCache = async () => {
  try {
    const keys = await redisClient.keys('reports:all:*');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (err) {
    console.error('Cache invalidation error:', err.message);
  }
};

class ReportController {
  
  static submitReport = catchAsync(async (req, res, next) => {
    const { category, description, evidenceUrl } = req.body;
    const caseCode = CryptoService.generateCaseCode();

    const { rows } = await db.query(
      `INSERT INTO reports (case_code, category, description, evidence_url) 
       VALUES ($1, $2, $3, $4) RETURNING case_code, status`,
      [caseCode, category, description, evidenceUrl || null]
    );

    await invalidateReportsCache();

    res.status(201).json({
      message: 'Report submitted successfully',
      caseCode: rows[0].case_code,
      status: rows[0].status,
    });
  });

  static getReportStatus = catchAsync(async (req, res, next) => {
    const { caseCode } = req.params;

    const { rows: reportRows } = await db.query(
      'SELECT id, category, status, created_at FROM reports WHERE case_code = $1',
      [caseCode]
    );

    if (reportRows.length === 0) {
      return next(new AppError('Report not found or invalid case code', 404));
    }

    const report = reportRows[0];

    const { rows: updates } = await db.query(
      'SELECT status, note, created_at FROM status_updates WHERE report_id = $1 ORDER BY created_at DESC',
      [report.id]
    );

    res.status(200).json({
      category: report.category,
      status: report.status,
      createdAt: report.created_at,
      updates,
    });
  });

  static getAllReports = catchAsync(async (req, res, next) => {
    const { category, status } = req.query;
    
    // Pagination params
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    // 1. Check Redis Cache
    const cacheKey = `reports:all:${category || 'any'}:${status || 'any'}:${page}:${limit}`;
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    // 2. Construct SQL Query
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (category) {
      whereClause += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Query for total count (for pagination metadata)
    const { rows: countRows } = await db.query(`SELECT COUNT(*) FROM reports ${whereClause}`, params);
    const totalCount = parseInt(countRows[0].count, 10);
    const totalPages = Math.ceil(totalCount / limit);

    // Query for paginated data
    const queryText = `
      SELECT id, case_code, category, description, evidence_url, status, created_at 
      FROM reports 
      ${whereClause} 
      ORDER BY created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    const { rows } = await db.query(queryText, params);

    const responsePayload = {
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages,
      },
      data: rows,
    };

    // 3. Save to Redis Cache (Expire in 60 seconds)
    await redisClient.setEx(cacheKey, 60, JSON.stringify(responsePayload));

    res.status(200).json(responsePayload);
  });

  static updateReportStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { status, note } = req.body;
    const moderatorId = req.moderatorId;

    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const { rows: reportRows } = await client.query('SELECT id FROM reports WHERE id = $1', [id]);
      if (reportRows.length === 0) {
        await client.query('ROLLBACK');
        return next(new AppError('Report not found', 404));
      }

      await client.query(
        `INSERT INTO status_updates (report_id, status, note, moderator_id) 
         VALUES ($1, $2, $3, $4)`,
        [id, status, note, moderatorId]
      );

      const { rows: updatedReport } = await client.query(
        'UPDATE reports SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, id]
      );

      await client.query('COMMIT');

      // Immediately invalidate Redis cache so admin sees updated status
      await invalidateReportsCache();
      
      res.status(200).json({
        message: 'Report status updated successfully',
        report: updatedReport[0],
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error; // Let catchAsync handle it
    } finally {
      client.release();
    }
  });
}

module.exports = ReportController;
