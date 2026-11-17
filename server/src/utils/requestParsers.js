import { createAppError } from './errors.js';

/**
 * Small helpers routes use to turn `req` values into plain service arguments.
 */

/**
 * @typedef {Object} Actor
 * @property {number} id - Signed-in user ID (from req.user, never from the body).
 * @property {string} roleCode - Signed-in user's role.
 * @property {string} fullName - Signed-in user's name (for notifications and report footers).
 * @property {string} ipAddress - Client IP for the audit log.
 */

/**
 * Parses a positive integer route parameter such as `:id`.
 * @param {string} value - Raw parameter value.
 * @param {string} [label='ID'] - Name used in the error message.
 * @returns {number} Parsed ID.
 * @throws {import('./errors.js').AppError} 400 when the value is not a positive integer.
 */
export const parseIdParam = (value, label = 'ID') => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw createAppError(`Invalid ${label}`, 400);
  }

  return id;
};

/**
 * Builds the actor passed to services for permission checks, ledger entries and audit logs.
 * @param {import('express').Request} req - Request with `req.user` set by `authenticate`.
 * @returns {Actor} Actor.
 */
export const getActor = (req) => ({
  id: req.user.id,
  roleCode: req.user.roleCode,
  fullName: req.user.fullName,
  ipAddress: req.ip,
});
