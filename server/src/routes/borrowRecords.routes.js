import { Router } from 'express';

import { authenticate, requirePasswordChanged } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import * as borrowRecordsService from '../services/borrowRecords.service.js';
import { ROLES } from '../utils/constants.js';
import { getActor, parseIdParam } from '../utils/requestParsers.js';

/**
 * Borrow record routes. Staff see their own records; Custodians (and Admins) see all and record
 * returns (AGENTS.md §9).
 */
export const borrowRecordsRouter = Router();

borrowRecordsRouter.use(authenticate, requirePasswordChanged);

borrowRecordsRouter.get('/', async (req, res) => {
  const result = await borrowRecordsService.listBorrowRecords(req.query, getActor(req));

  res.json({ success: true, data: result.rows, meta: result.meta });
});

borrowRecordsRouter.get('/:id', async (req, res) => {
  const record = await borrowRecordsService.getBorrowRecord(
    parseIdParam(req.params.id),
    getActor(req),
  );

  res.json({ success: true, data: record });
});

borrowRecordsRouter.post(
  '/:id/return',
  authorize(ROLES.CUSTODIAN, ROLES.ADMIN),
  async (req, res) => {
    const record = await borrowRecordsService.returnItems(
      parseIdParam(req.params.id),
      req.body || {},
      getActor(req),
    );

    res.json({ success: true, data: record });
  },
);
