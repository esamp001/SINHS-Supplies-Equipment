import { ENV } from '../config/env.js';
import { findActiveUser, verifyToken } from '../services/auth.service.js';
import { createAppError } from '../utils/errors.js';

/**
 * Requires a valid auth cookie. Loads the user, rejects inactive accounts and sets `req.user`.
 * @param {import('express').Request} req - Request.
 * @param {import('express').Response} res - Response.
 * @param {import('express').NextFunction} next - Next middleware.
 * @returns {Promise<void>}
 * @throws {import('../utils/errors.js').AppError} 401 when not signed in or the account is no longer active.
 */
export const authenticate = async (req, res, next) => {
  const token = req.cookies?.[ENV.cookieName];
  const userId = token ? verifyToken(token) : null;
  const user = userId ? await findActiveUser(userId) : null;

  if (!user) {
    res.clearCookie(ENV.cookieName, { path: '/' });
    throw createAppError('Not authenticated', 401);
  }

  req.user = user;
  next();
};

/**
 * Blocks users who must change their password (after an admin reset) from everything except
 * auth/me, auth/logout and auth/change-password (AGENTS.md §10).
 * @param {import('express').Request} req - Request.
 * @param {import('express').Response} _res - Response (unused).
 * @param {import('express').NextFunction} next - Next middleware.
 * @returns {void}
 * @throws {import('../utils/errors.js').AppError} 403 when a password change is required.
 */
export const requirePasswordChanged = (req, _res, next) => {
  if (req.user?.mustChangePassword) {
    throw createAppError('Please change your password to continue.', 403);
  }

  next();
};
