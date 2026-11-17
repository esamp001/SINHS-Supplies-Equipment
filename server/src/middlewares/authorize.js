import { createAppError } from '../utils/errors.js';

/**
 * Allows only users with one of the given roles. Use after `authenticate`.
 * @param {...string} roleCodes - Allowed role codes, e.g. `authorize('admin', 'custodian')`.
 * @returns {import('express').RequestHandler} Middleware.
 */
export const authorize =
  (...roleCodes) =>
  (req, _res, next) => {
    if (!req.user || !roleCodes.includes(req.user.roleCode)) {
      throw createAppError('You are not allowed to do this', 403);
    }

    next();
  };
