import { Router } from 'express';

import { authenticate, requirePasswordChanged } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import * as masterDataService from '../services/masterData.service.js';
import { ROLES } from '../utils/constants.js';
import { getActor, parseIdParam } from '../utils/requestParsers.js';

/**
 * Master data routes: `/master-data/:resource` for categories, units, locations and positions.
 * Any signed-in user can read (dropdowns); only Admins can change them (AGENTS.md §10).
 */
export const masterDataRouter = Router();

masterDataRouter.use(authenticate, requirePasswordChanged);

masterDataRouter.get('/:resource', async (req, res) => {
  const records = await masterDataService.listRecords(req.params.resource);

  res.json({ success: true, data: records });
});

masterDataRouter.post('/:resource', authorize(ROLES.ADMIN), async (req, res) => {
  const record = await masterDataService.createRecord(
    req.params.resource,
    req.body || {},
    getActor(req),
  );

  res.status(201).json({ success: true, data: record });
});

masterDataRouter.put('/:resource/:id', authorize(ROLES.ADMIN), async (req, res) => {
  const record = await masterDataService.updateRecord(
    req.params.resource,
    parseIdParam(req.params.id),
    req.body || {},
    getActor(req),
  );

  res.json({ success: true, data: record });
});

masterDataRouter.delete('/:resource/:id', authorize(ROLES.ADMIN), async (req, res) => {
  await masterDataService.deleteRecord(
    req.params.resource,
    parseIdParam(req.params.id),
    getActor(req),
  );

  res.json({ success: true, data: null });
});
