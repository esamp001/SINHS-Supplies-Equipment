import { Router } from 'express';

import { authenticate, requirePasswordChanged } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import * as reportsService from '../services/reports.service.js';
import { REPORT_FORMATS, ROLES } from '../utils/constants.js';
import { getActor } from '../utils/requestParsers.js';

/**
 * Report routes (Admin, Custodian): `GET /reports/:report?format=json|xlsx|pdf&...filters`.
 * Exports come from the same service that serves the on-screen data (AGENTS.md §5).
 */
export const reportsRouter = Router();

reportsRouter.use(authenticate, requirePasswordChanged, authorize(ROLES.ADMIN, ROLES.CUSTODIAN));

reportsRouter.get('/:report', async (req, res) => {
  const format = req.query.format || REPORT_FORMATS.JSON;

  if (format === REPORT_FORMATS.JSON) {
    const report = await reportsService.getReport(req.params.report, req.query, getActor(req));

    res.json({ success: true, data: report });

    return;
  }

  const file = await reportsService.exportReport(
    req.params.report,
    format,
    req.query,
    getActor(req),
  );

  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
  res.send(file.buffer);
});
