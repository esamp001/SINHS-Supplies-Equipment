import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';

import { db } from '../config/db.js';
import * as auditLogsRepository from '../repositories/auditLogs.repository.js';
import * as lookupsRepository from '../repositories/lookups.repository.js';
import * as notificationsRepository from '../repositories/notifications.repository.js';
import * as usersRepository from '../repositories/users.repository.js';
import { AppError, throwIfInvalid } from '../utils/AppError.js';
import {
  AUDIT_ACTIONS,
  BCRYPT_ROUNDS,
  ENTITY_TYPES,
  NOTIFICATION_TYPES,
  ROLES,
  USER_STATUS,
} from '../utils/constants.js';
import { isOneOf, isPositiveInt, isRequired } from '../utils/validators.js';

/**
 * @typedef {import('../repositories/users.repository.js').UserRecord} UserRecord
 */

/**
 * @typedef {Object} Actor
 * @property {number} id - ID of the admin performing the action (from req.user).
 * @property {string} ipAddress - Client IP for the audit log.
 */

/**
 * Lists users for the Users page. Without a status, returns active and deactivated users.
 * @param {{ status?: string, search?: string }} query - Query parameters.
 * @returns {Promise<UserRecord[]>} Users.
 * @throws {AppError} 400 for an unknown status.
 */
export const listUsers = async ({ status, search }) => {
  if (status && !isOneOf(status, Object.values(USER_STATUS))) {
    throw new AppError('Validation failed', 400, { status: 'Unknown status' });
  }

  const statuses = status ? [status] : [USER_STATUS.ACTIVE, USER_STATUS.DEACTIVATED];

  return usersRepository.list({ statuses, search: (search || '').trim() });
};

/**
 * Loads a user inside a transaction (row-locked) or throws 404.
 * @param {number} userId - User ID.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<UserRecord>} User.
 * @throws {AppError} 404 when not found.
 */
const getUserForUpdate = async (userId, trx) => {
  const user = await usersRepository.findByIdForUpdate(userId, trx);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

/**
 * Validates a role code.
 * @param {*} roleCode - Role code from the request.
 * @returns {void}
 * @throws {AppError} 400 when invalid.
 */
const assertValidRole = (roleCode) => {
  if (!isOneOf(roleCode, Object.values(ROLES))) {
    throw new AppError('Validation failed', 400, { roleCode: 'Choose a valid role' });
  }
};

/**
 * Approves a pending registration: assigns role and position and activates the account.
 * @param {number} userId - User to approve.
 * @param {{ roleCode?: string, positionId?: number }} payload - Request body.
 * @param {Actor} actor - Admin performing the action.
 * @returns {Promise<UserRecord>} Updated user.
 * @throws {AppError} 400 invalid input, 404 not found, 409 not pending.
 */
export const approveUser = async (userId, payload, actor) => {
  const { roleCode, positionId } = payload;

  assertValidRole(roleCode);

  if (!isPositiveInt(positionId) || !(await lookupsRepository.positionExists(Number(positionId)))) {
    throw new AppError('Validation failed', 400, { positionId: 'Select a valid position' });
  }

  return db.transaction(async (trx) => {
    const before = await getUserForUpdate(userId, trx);

    if (before.status !== USER_STATUS.PENDING) {
      throw new AppError('Only pending accounts can be approved', 409);
    }

    const roleId = await lookupsRepository.findRoleIdByCode(roleCode, trx);

    await usersRepository.update(
      userId,
      {
        role_id: roleId,
        position_id: Number(positionId),
        status: USER_STATUS.ACTIVE,
        approved_by: actor.id,
        approved_at: trx.fn.now(),
        updated_by: actor.id,
      },
      trx,
    );

    const after = await usersRepository.findById(userId, trx);

    await auditLogsRepository.create(
      {
        userId: actor.id,
        action: AUDIT_ACTIONS.APPROVE,
        entityType: ENTITY_TYPES.USER,
        entityId: userId,
        before,
        after,
        ipAddress: actor.ipAddress,
      },
      trx,
    );

    await notificationsRepository.createForUsers(
      [userId],
      {
        type: NOTIFICATION_TYPES.ACCOUNT_APPROVED,
        title: 'Your account was approved',
        message: `You can now sign in. Your role is ${after.roleCode}.`,
      },
      trx,
    );

    return after;
  });
};

/**
 * Rejects a pending registration. A reason is required.
 * @param {number} userId - User to reject.
 * @param {{ reason?: string }} payload - Request body.
 * @param {Actor} actor - Admin performing the action.
 * @returns {Promise<UserRecord>} Updated user.
 * @throws {AppError} 400 missing reason, 404 not found, 409 not pending.
 */
export const rejectUser = async (userId, payload, actor) => {
  const { reason = '' } = payload;

  throwIfInvalid(isRequired(reason) ? {} : { reason: 'A reason is required' });

  return db.transaction(async (trx) => {
    const before = await getUserForUpdate(userId, trx);

    if (before.status !== USER_STATUS.PENDING) {
      throw new AppError('Only pending accounts can be rejected', 409);
    }

    await usersRepository.update(
      userId,
      { status: USER_STATUS.REJECTED, rejection_reason: reason.trim(), updated_by: actor.id },
      trx,
    );

    const after = await usersRepository.findById(userId, trx);

    await auditLogsRepository.create(
      {
        userId: actor.id,
        action: AUDIT_ACTIONS.REJECT,
        entityType: ENTITY_TYPES.USER,
        entityId: userId,
        before,
        after,
        ipAddress: actor.ipAddress,
      },
      trx,
    );

    await notificationsRepository.createForUsers(
      [userId],
      {
        type: NOTIFICATION_TYPES.ACCOUNT_REJECTED,
        title: 'Your registration was not approved',
        message: `Reason: ${reason.trim()}`,
      },
      trx,
    );

    return after;
  });
};

/**
 * Changes the role of an approved user. Admins cannot change their own role.
 * @param {number} userId - Target user.
 * @param {{ roleCode?: string }} payload - Request body.
 * @param {Actor} actor - Admin performing the action.
 * @returns {Promise<UserRecord>} Updated user.
 * @throws {AppError} 400 invalid role, 404 not found, 409 own account or not approved.
 */
export const changeUserRole = async (userId, payload, actor) => {
  const { roleCode } = payload;

  assertValidRole(roleCode);

  if (userId === actor.id) {
    throw new AppError('You cannot change your own role', 409);
  }

  return db.transaction(async (trx) => {
    const before = await getUserForUpdate(userId, trx);

    if (![USER_STATUS.ACTIVE, USER_STATUS.DEACTIVATED].includes(before.status)) {
      throw new AppError('Only approved accounts can have their role changed', 409);
    }

    const roleId = await lookupsRepository.findRoleIdByCode(roleCode, trx);

    await usersRepository.update(userId, { role_id: roleId, updated_by: actor.id }, trx);
    const after = await usersRepository.findById(userId, trx);

    await auditLogsRepository.create(
      {
        userId: actor.id,
        action: AUDIT_ACTIONS.ROLE_CHANGE,
        entityType: ENTITY_TYPES.USER,
        entityId: userId,
        before: { roleCode: before.roleCode },
        after: { roleCode: after.roleCode },
        ipAddress: actor.ipAddress,
      },
      trx,
    );

    return after;
  });
};

/**
 * Generates a readable temporary password.
 * @returns {string} Temporary password, e.g. "Temp-4f9k2q7a".
 */
const generateTemporaryPassword = () => `Temp-${crypto.randomBytes(6).toString('base64url')}`;

/**
 * Resets a user's password to a temporary one that must be changed at next sign-in.
 * @param {number} userId - Target user.
 * @param {Actor} actor - Admin performing the action.
 * @returns {Promise<{ temporaryPassword: string }>} Temporary password to give to the user.
 * @throws {AppError} 404 not found, 409 not approved.
 */
export const resetUserPassword = async (userId, actor) => {
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);

  await db.transaction(async (trx) => {
    const user = await getUserForUpdate(userId, trx);

    if (![USER_STATUS.ACTIVE, USER_STATUS.DEACTIVATED].includes(user.status)) {
      throw new AppError('Only approved accounts can have their password reset', 409);
    }

    await usersRepository.update(
      userId,
      { password_hash: passwordHash, must_change_password: true, updated_by: actor.id },
      trx,
    );

    await auditLogsRepository.create(
      {
        userId: actor.id,
        action: AUDIT_ACTIONS.PASSWORD_RESET,
        entityType: ENTITY_TYPES.USER,
        entityId: userId,
        ipAddress: actor.ipAddress,
      },
      trx,
    );
  });

  return { temporaryPassword };
};

/**
 * Activates or deactivates an approved user. Admins cannot deactivate themselves.
 * @param {number} userId - Target user.
 * @param {{ status?: string }} payload - Request body.
 * @param {Actor} actor - Admin performing the action.
 * @returns {Promise<UserRecord>} Updated user.
 * @throws {AppError} 400 invalid status, 404 not found, 409 own account or not approved.
 */
export const changeUserStatus = async (userId, payload, actor) => {
  const { status } = payload;

  if (!isOneOf(status, [USER_STATUS.ACTIVE, USER_STATUS.DEACTIVATED])) {
    throw new AppError('Validation failed', 400, {
      status: 'Status must be active or deactivated',
    });
  }

  if (userId === actor.id) {
    throw new AppError('You cannot change your own account status', 409);
  }

  return db.transaction(async (trx) => {
    const before = await getUserForUpdate(userId, trx);

    if (![USER_STATUS.ACTIVE, USER_STATUS.DEACTIVATED].includes(before.status)) {
      throw new AppError('Only approved accounts can be activated or deactivated', 409);
    }

    await usersRepository.update(userId, { status, updated_by: actor.id }, trx);
    const after = await usersRepository.findById(userId, trx);

    await auditLogsRepository.create(
      {
        userId: actor.id,
        action: AUDIT_ACTIONS.STATUS_CHANGE,
        entityType: ENTITY_TYPES.USER,
        entityId: userId,
        before: { status: before.status },
        after: { status: after.status },
        ipAddress: actor.ipAddress,
      },
      trx,
    );

    return after;
  });
};
