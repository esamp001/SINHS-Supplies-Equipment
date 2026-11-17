import { Router } from 'express';

import { authenticate, requirePasswordChanged } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import * as itemTypesService from '../services/itemTypes.service.js';
import { ROLES } from '../utils/constants.js';
import { getActor, parseIdParam } from '../utils/requestParsers.js';

/**
 * Item type routes with their custom fields. Any signed-in user can read;
 * Admins and Custodians can change them (AGENTS.md §10).
 */
export const itemTypesRouter = Router();

const canManage = authorize(ROLES.ADMIN, ROLES.CUSTODIAN);

itemTypesRouter.use(authenticate, requirePasswordChanged);

itemTypesRouter.get('/', async (req, res) => {
  const itemTypes = await itemTypesService.listItemTypes(req.query);

  res.json({ success: true, data: itemTypes });
});

itemTypesRouter.get('/:id', async (req, res) => {
  const itemType = await itemTypesService.getItemType(parseIdParam(req.params.id));

  res.json({ success: true, data: itemType });
});

itemTypesRouter.post('/', canManage, async (req, res) => {
  const itemType = await itemTypesService.createItemType(req.body || {}, getActor(req));

  res.status(201).json({ success: true, data: itemType });
});

itemTypesRouter.put('/:id', canManage, async (req, res) => {
  const itemType = await itemTypesService.updateItemType(
    parseIdParam(req.params.id),
    req.body || {},
    getActor(req),
  );

  res.json({ success: true, data: itemType });
});

itemTypesRouter.delete('/:id', canManage, async (req, res) => {
  await itemTypesService.deleteItemType(parseIdParam(req.params.id), getActor(req));

  res.json({ success: true, data: null });
});

itemTypesRouter.post('/:id/fields', canManage, async (req, res) => {
  const itemType = await itemTypesService.createField(
    parseIdParam(req.params.id),
    req.body || {},
    getActor(req),
  );

  res.status(201).json({ success: true, data: itemType });
});

itemTypesRouter.put('/:id/fields/:fieldId', canManage, async (req, res) => {
  const itemType = await itemTypesService.updateField(
    parseIdParam(req.params.id),
    parseIdParam(req.params.fieldId, 'field ID'),
    req.body || {},
    getActor(req),
  );

  res.json({ success: true, data: itemType });
});

itemTypesRouter.delete('/:id/fields/:fieldId', canManage, async (req, res) => {
  const itemType = await itemTypesService.deleteField(
    parseIdParam(req.params.id),
    parseIdParam(req.params.fieldId, 'field ID'),
    getActor(req),
  );

  res.json({ success: true, data: itemType });
});
