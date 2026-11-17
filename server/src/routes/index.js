import { Router } from 'express';

import { auditLogsRouter } from './auditLogs.routes.js';
import { authRouter } from './auth.routes.js';
import { borrowRecordsRouter } from './borrowRecords.routes.js';
import { dashboardRouter } from './dashboard.routes.js';
import { itemsRouter } from './items.routes.js';
import { itemTypesRouter } from './itemTypes.routes.js';
import { lookupsRouter } from './lookups.routes.js';
import { masterDataRouter } from './masterData.routes.js';
import { notificationsRouter } from './notifications.routes.js';
import { reportsRouter } from './reports.routes.js';
import { requestsRouter } from './requests.routes.js';
import { stockTransactionsRouter } from './stockTransactions.routes.js';
import { usersRouter } from './users.routes.js';

/**
 * API v1 router: mounts every resource router under /api/v1.
 */
export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/master-data', masterDataRouter);
apiRouter.use('/item-types', itemTypesRouter);
apiRouter.use('/items', itemsRouter);
apiRouter.use('/stock-transactions', stockTransactionsRouter);
apiRouter.use('/requests', requestsRouter);
apiRouter.use('/borrow-records', borrowRecordsRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/audit-logs', auditLogsRouter);
apiRouter.use('/', lookupsRouter);
