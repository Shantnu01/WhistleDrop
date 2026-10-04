const { Router } = require('express');
const ReportController = require('../controllers/report.controller');
const { validate } = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { reportSubmissionLimiter } = require('../middlewares/rateLimit.middleware');
const {
  createReportSchema,
  getReportSchema,
  updateReportStatusSchema,
} = require('../schemas/report.schema');

const router = Router();

// =======================
// PUBLIC ANONYMOUS ROUTES
// =======================

// Submit a new anonymous report
router.post(
  '/',
  reportSubmissionLimiter,
  validate(createReportSchema),
  ReportController.submitReport
);

// Track a report's status using case code
router.get(
  '/:caseCode',
  validate(getReportSchema),
  ReportController.getReportStatus
);

// =======================
// MODERATOR PROTECTED ROUTES
// =======================

// Get all reports (Moderator only)
router.get(
  '/moderator/all',
  authenticate,
  ReportController.getAllReports
);

// Update a report's status (Moderator only)
router.patch(
  '/moderator/:id/status',
  authenticate,
  validate(updateReportStatusSchema),
  ReportController.updateReportStatus
);

module.exports = router;
