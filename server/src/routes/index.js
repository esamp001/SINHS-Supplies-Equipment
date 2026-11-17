import { Router } from 'express';

import { authRouter } from './auth.routes.js';
import { lookupsRouter } from './lookups.routes.js';
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
apiRouter.use('/', lookupsRouter);
