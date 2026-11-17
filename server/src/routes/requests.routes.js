import { Router } from 'express';

import { authenticate, requirePasswordChanged } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import * as requestsService from '../services/requests.service.js';
import { ROLES } from '../utils/constants.js';
import { getActor, parseIdParam } from '../utils/requestParsers.js';

/**
 * Inventory request routes. Anyone signed in can submit and cancel their own requests; Custodians
 * (and Admins as a fallback) approve, reject and release (AGENTS.md §9, §10).
 */
export const requestsRouter = Router();

const canReview = authorize(ROLES.CUSTODIAN, ROLES.ADMIN);

requestsRouter.use(authenticate, requirePasswordChanged);

requestsRouter.get('/', async (req, res) => {
  const result = await requestsService.listRequests(req.query, getActor(req));

  res.json({ success: true, data: result.rows, meta: result.meta });
});

requestsRouter.get('/:id', async (req, res) => {
  const request = await requestsService.getRequest(parseIdParam(req.params.id), getActor(req));

  res.json({ success: true, data: request });
});

requestsRouter.post('/', async (req, res) => {
  const request = await requestsService.createRequest(req.body || {}, getActor(req));

  res.status(201).json({ success: true, data: request });
});

requestsRouter.post('/:id/cancel', async (req, res) => {
  const request = await requestsService.cancelRequest(parseIdParam(req.params.id), getActor(req));

  res.json({ success: true, data: request });
});

requestsRouter.post('/:id/approve', canReview, async (req, res) => {
  const request = await requestsService.approveRequest(
    parseIdParam(req.params.id),
    req.body || {},
    getActor(req),
  );

  res.json({ success: true, data: request });
});

requestsRouter.post('/:id/reject', canReview, async (req, res) => {
  const request = await requestsService.rejectRequest(
    parseIdParam(req.params.id),
    req.body || {},
    getActor(req),
  );

  res.json({ success: true, data: request });
});

requestsRouter.post('/:id/release', canReview, async (req, res) => {
  const request = await requestsService.releaseRequest(
    parseIdParam(req.params.id),
    req.body || {},
    getActor(req),
  );

  res.json({ success: true, data: request });
});
