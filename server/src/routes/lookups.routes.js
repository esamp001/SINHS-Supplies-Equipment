import { Router } from 'express';

import * as lookupsService from '../services/lookups.service.js';

/**
 * Lookup routes for dropdowns. `/positions` is public because the registration form needs it.
 */
export const lookupsRouter = Router();

lookupsRouter.get('/positions', async (_req, res) => {
  const positions = await lookupsService.listPositions();

  res.json({ success: true, data: positions });
});
