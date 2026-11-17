import { Router } from 'express';

import { authenticate, requirePasswordChanged } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import * as itemsService from '../services/items.service.js';
import { ROLES } from '../utils/constants.js';
import { getActor, parseIdParam } from '../utils/requestParsers.js';

/**
 * Item routes. Any signed-in user can browse items (staff pick items to request);
 * Admins and Custodians manage items and their units (AGENTS.md §10).
 */
export const itemsRouter = Router();

const canManage = authorize(ROLES.ADMIN, ROLES.CUSTODIAN);

itemsRouter.use(authenticate, requirePasswordChanged);

itemsRouter.get('/', async (req, res) => {
  const result = await itemsService.listItems(req.query);

  res.json({ success: true, data: result.rows, meta: result.meta });
});

itemsRouter.get('/:id', async (req, res) => {
  const item = await itemsService.getItem(parseIdParam(req.params.id));

  res.json({ success: true, data: item });
});

itemsRouter.post('/', canManage, async (req, res) => {
  const item = await itemsService.createItem(req.body || {}, getActor(req));

  res.status(201).json({ success: true, data: item });
});

itemsRouter.put('/:id', canManage, async (req, res) => {
  const item = await itemsService.updateItem(
    parseIdParam(req.params.id),
    req.body || {},
    getActor(req),
  );

  res.json({ success: true, data: item });
});

itemsRouter.delete('/:id', canManage, async (req, res) => {
  await itemsService.deleteItem(parseIdParam(req.params.id), getActor(req));

  res.json({ success: true, data: null });
});

itemsRouter.post('/:id/units', canManage, async (req, res) => {
  const units = await itemsService.addUnit(
    parseIdParam(req.params.id),
    req.body || {},
    getActor(req),
  );

  res.status(201).json({ success: true, data: units });
});

itemsRouter.put('/:id/units/:unitId', canManage, async (req, res) => {
  const units = await itemsService.updateUnit(
    parseIdParam(req.params.id),
    parseIdParam(req.params.unitId, 'unit ID'),
    req.body || {},
    getActor(req),
  );

  res.json({ success: true, data: units });
});

itemsRouter.post('/:id/units/:unitId/status', canManage, async (req, res) => {
  const units = await itemsService.changeUnitStatus(
    parseIdParam(req.params.id),
    parseIdParam(req.params.unitId, 'unit ID'),
    req.body || {},
    getActor(req),
  );

  res.json({ success: true, data: units });
});
