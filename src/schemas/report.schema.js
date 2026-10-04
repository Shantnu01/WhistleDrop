const { z } = require('zod');

const ReportCategoryEnum = z.enum(['SECURITY', 'HARASSMENT', 'CORRUPTION', 'TECHNICAL', 'OTHER']);
const ReportStatusEnum = z.enum(['SUBMITTED', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED']);

const createReportSchema = z.object({
  body: z.object({
    category: ReportCategoryEnum,
    description: z.string().min(10, 'Description must be at least 10 characters long'),
    evidenceUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  }),
});

const updateReportStatusSchema = z.object({
  body: z.object({
    status: ReportStatusEnum,
    note: z.string().min(1, 'Note is required when updating status'),
  }),
  params: z.object({
    id: z.string().uuid('Invalid report ID'),
  }),
});

const getReportSchema = z.object({
  params: z.object({
    caseCode: z.string().min(14).max(14), // Expected format: XXXX-XXXX-XXXX
  }),
});

module.exports = {
  createReportSchema,
  updateReportStatusSchema,
  getReportSchema
};
