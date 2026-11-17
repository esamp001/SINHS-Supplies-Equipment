import { Router } from 'express';

import { authenticate, requirePasswordChanged } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import * as stockTransactionsService from '../services/stockTransactions.service.js';
import { ROLES } from '../utils/constants.js';
import { getActor } from '../utils/requestParsers.js';

/**
 * Stock ledger routes (Custodian, Admin as fallback): history, stock-in, adjustments and the
 * reconcile check. Releases and returns write ledger entries through their own workflows.
 */
export const stockTransactionsRouter = Router();

stockTransactionsRouter.use(
  authenticate,
  requirePasswordChanged,
  authorize(ROLES.ADMIN, ROLES.CUSTODIAN),
);

stockTransactionsRouter.get('/', async (req, res) => {
  const result = await stockTransactionsService.listTransactions(req.query);

  res.json({ success: true, data: result.rows, meta: result.meta });
});

stockTransactionsRouter.get('/reconciliation', async (_req, res) => {
  const mismatches = await stockTransactionsService.getReconciliation();

  res.json({ success: true, data: mismatches });
});

stockTransactionsRouter.post('/stock-in', async (req, res) => {
  const item = await stockTransactionsService.stockIn(req.body || {}, getActor(req));

  res.status(201).json({ success: true, data: item });
});

stockTransactionsRouter.post('/adjustments', async (req, res) => {
  const item = await stockTransactionsService.adjustStock(req.body || {}, getActor(req));

  res.status(201).json({ success: true, data: item });
});
