const db = require('../config/db');
const { redisClient } = require('../config/redis');
const CryptoService = require('../services/crypto.service');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// Atomic O(1) Cache Invalidation using a Redis Set Registry (No blocking KEYS command)
const invalidateReportsCache = async (caseCode = null) => {
  try {
    const keys = await redisClient.sMembers('cache_registry:reports:all');
    if (keys && keys.length > 0) {
      await redisClient.del(keys);
      await redisClient.del('cache_registry:reports:all');
    }
    // Also invalidate the specific case tracking cache if provided
    if (caseCode) {
      await redisClient.del(`report:tracking:${caseCode}`);
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

    // Invalidate list caches so new reports appear immediately
    await invalidateReportsCache();

    res.status(201).json({
      message: 'Report submitted successfully',
      caseCode: rows[0].case_code,
      status: rows[0].status,
    });
  });

  // Cached Public Case Tracking: Protects DB from refresh spam during high-interest events
  static getReportStatus = catchAsync(async (req, res, next) => {
    const { caseCode } = req.params;
    const cacheKey = `report:tracking:${caseCode}`;

    // 1. Check Redis Cache
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    // 2. Fetch from Database using Indexed Case Code Lookup
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

    const payload = {
      category: report.category,
      status: report.status,
      createdAt: report.created_at,
      updates,
    };

    // 3. Cache for 60 seconds in Redis
    await redisClient.setEx(cacheKey, 60, JSON.stringify(payload));

    res.status(200).json(payload);
  });

  // Moderator List: Supports both Keyset/Cursor Pagination (O(1)) and Page-based Pagination
  static getAllReports = catchAsync(async (req, res, next) => {
    const { category, status, cursor } = req.query;
    
    // Pagination params
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    // 1. Check Redis Cache
    const cacheKey = `reports:all:${category || 'any'}:${status || 'any'}:${cursor || 'nocursor'}:${page}:${limit}`;
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    // 2. Construct Count Query (Filters only, not cursor)
    let countWhereClause = 'WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;

    if (category) {
      countWhereClause += ` AND category = $${countParamIndex}`;
      countParams.push(category);
      countParamIndex++;
    }

    if (status) {
      countWhereClause += ` AND status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    const { rows: countRows } = await db.query(`SELECT COUNT(*) FROM reports ${countWhereClause}`, countParams);
    const totalCount = parseInt(countRows[0].count, 10);
    const totalPages = Math.ceil(totalCount / limit);

    // 3. Construct Data Query (Applying compound indexes & optional cursor)
    let dataWhereClause = countWhereClause;
    const dataParams = [...countParams];
    let dataParamIndex = countParamIndex;

    if (cursor) {
      dataWhereClause += ` AND created_at < $${dataParamIndex}`;
      dataParams.push(cursor);
      dataParamIndex++;
    }

    let queryText = '';
    if (cursor) {
      queryText = `
        SELECT id, case_code, category, description, evidence_url, status, created_at 
        FROM reports 
        ${dataWhereClause} 
        ORDER BY created_at DESC 
        LIMIT $${dataParamIndex}
      `;
      dataParams.push(limit);
    } else {
      queryText = `
        SELECT id, case_code, category, description, evidence_url, status, created_at 
        FROM reports 
        ${dataWhereClause} 
        ORDER BY created_at DESC 
        LIMIT $${dataParamIndex} OFFSET $${dataParamIndex + 1}
      `;
      dataParams.push(limit, offset);
    }
    
    const { rows } = await db.query(queryText, dataParams);

    const nextCursor = rows.length > 0 ? rows[rows.length - 1].created_at : null;

    const responsePayload = {
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages,
        nextCursor,
      },
      data: rows,
    };

    // 3. Save to Redis Cache (60s TTL) and register key in set registry
    await redisClient.setEx(cacheKey, 60, JSON.stringify(responsePayload));
    await redisClient.sAdd('cache_registry:reports:all', cacheKey);

    res.status(200).json(responsePayload);
  });

  static updateReportStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { status, note } = req.body;
    const moderatorId = req.moderatorId;

    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const { rows: reportRows } = await client.query('SELECT id, case_code FROM reports WHERE id = $1', [id]);
      if (reportRows.length === 0) {
        await client.query('ROLLBACK');
        return next(new AppError('Report not found', 404));
      }

      const caseCode = reportRows[0].case_code;

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

      // Atomically invalidate list cache & specific case tracking cache
      await invalidateReportsCache(caseCode);
      
      res.status(200).json({
        message: 'Report status updated successfully',
        report: updatedReport[0],
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });
}

module.exports = ReportController;
