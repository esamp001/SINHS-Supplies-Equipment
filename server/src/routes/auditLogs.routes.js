import { Router } from 'express';

import { authenticate, requirePasswordChanged } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import * as auditLogsService from '../services/auditLogs.service.js';
import { ROLES } from '../utils/constants.js';

/**
 * Audit log routes (Admin only, read-only). There are no update or delete endpoints:
 * audit logs are insert-only (AGENTS.md §9).
 */
export const auditLogsRouter = Router();

auditLogsRouter.use(authenticate, requirePasswordChanged, authorize(ROLES.ADMIN));

auditLogsRouter.get('/', async (req, res) => {
  const result = await auditLogsService.listAuditLogs(req.query);

  res.json({ success: true, data: result.rows, meta: result.meta });
});

auditLogsRouter.get('/filters', async (_req, res) => {
  const filters = await auditLogsService.getAuditLogFilters();

  res.json({ success: true, data: filters });
});
