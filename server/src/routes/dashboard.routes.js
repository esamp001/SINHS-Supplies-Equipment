import { Router } from 'express';

import { authenticate, requirePasswordChanged } from '../middlewares/auth.js';
import * as dashboardService from '../services/dashboard.service.js';

/**
 * Dashboard routes. Any signed-in role; the service returns only what that role may see.
 */
export const dashboardRouter = Router();

dashboardRouter.use(authenticate, requirePasswordChanged);

dashboardRouter.get('/summary', async (req, res) => {
  const summary = await dashboardService.getDashboardSummary(req.user);

  res.json({ success: true, data: summary });
});
