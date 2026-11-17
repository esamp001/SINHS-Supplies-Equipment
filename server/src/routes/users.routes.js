import { Router } from 'express';

import { authenticate, requirePasswordChanged } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import * as usersService from '../services/users.service.js';
import { AppError } from '../utils/AppError.js';
import { ROLES } from '../utils/constants.js';

/**
 * User management routes (Admin only): list, approve, reject, change role, reset password, status.
 */
export const usersRouter = Router();

usersRouter.use(authenticate, requirePasswordChanged, authorize(ROLES.ADMIN));

/**
 * Parses the `:id` route parameter.
 * @param {import('express').Request} req - Request.
 * @returns {number} User ID.
 * @throws {AppError} 400 when the ID is not a positive integer.
 */
const parseUserId = (req) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('Invalid user ID', 400);
  }

  return id;
};

/**
 * Builds the actor (admin) info passed to services for permission checks and audit logs.
 * @param {import('express').Request} req - Request.
 * @returns {import('../services/users.service.js').Actor} Actor.
 */
const getActor = (req) => ({ id: req.user.id, ipAddress: req.ip });

usersRouter.get('/', async (req, res) => {
  const users = await usersService.listUsers({
    status: req.query.status,
    search: req.query.search,
  });

  res.json({ success: true, data: users });
});

usersRouter.post('/:id/approve', async (req, res) => {
  const user = await usersService.approveUser(parseUserId(req), req.body || {}, getActor(req));

  res.json({ success: true, data: user });
});

usersRouter.post('/:id/reject', async (req, res) => {
  const user = await usersService.rejectUser(parseUserId(req), req.body || {}, getActor(req));

  res.json({ success: true, data: user });
});

usersRouter.put('/:id/role', async (req, res) => {
  const user = await usersService.changeUserRole(parseUserId(req), req.body || {}, getActor(req));

  res.json({ success: true, data: user });
});

usersRouter.post('/:id/reset-password', async (req, res) => {
  const result = await usersService.resetUserPassword(parseUserId(req), getActor(req));

  res.json({ success: true, data: result });
});

usersRouter.put('/:id/status', async (req, res) => {
  const user = await usersService.changeUserStatus(parseUserId(req), req.body || {}, getActor(req));

  res.json({ success: true, data: user });
});
