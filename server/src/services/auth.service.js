import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { db } from '../config/db.js';
import { ENV } from '../config/env.js';
import * as auditLogsRepository from '../repositories/auditLogs.repository.js';
import * as lookupsRepository from '../repositories/lookups.repository.js';
import * as notificationsRepository from '../repositories/notifications.repository.js';
import * as usersRepository from '../repositories/users.repository.js';
import { AppError, throwIfInvalid } from '../utils/AppError.js';
import {
  AUDIT_ACTIONS,
  BCRYPT_ROUNDS,
  ENTITY_TYPES,
  MIN_PASSWORD_LENGTH,
  NOTIFICATION_TYPES,
  ROLES,
  USER_STATUS,
} from '../utils/constants.js';
import { isEmail, isPositiveInt, isRequired, isUsername } from '../utils/validators.js';

/** Messages for accounts that exist but cannot sign in. */
const STATUS_MESSAGES = {
  [USER_STATUS.PENDING]: 'Your account is pending approval by an administrator.',
  [USER_STATUS.REJECTED]: 'Your registration was not approved. Please contact the administrator.',
  [USER_STATUS.DEACTIVATED]: 'Your account is deactivated. Please contact the administrator.',
};

const INVALID_CREDENTIALS = 'Invalid username or password';

/**
 * Registers a new account as pending with no role (AGENTS.md §10 Self-registration).
 * @param {{ fullName?: string, username?: string, email?: string, positionId?: number, password?: string, confirmPassword?: string }} payload - Request body.
 * @param {string} ipAddress - Client IP for the audit log.
 * @returns {Promise<import('../repositories/users.repository.js').UserRecord>} Created (pending) user.
 * @throws {AppError} 400 with field errors when invalid.
 */
export const register = async (payload, ipAddress) => {
  const { fullName = '', username = '', email = '', positionId, password = '' } = payload;
  const confirmPassword = payload.confirmPassword ?? password;
  const errors = {};

  if (!isRequired(fullName)) {
    errors.fullName = 'Enter your full name';
  }

  if (!isRequired(username)) {
    errors.username = 'Choose a username';
  } else if (!isUsername(username)) {
    errors.username = 'Use 3–50 letters, numbers, dots, underscores or hyphens';
  } else if (await usersRepository.usernameExists(username.trim())) {
    errors.username = 'Username is already taken';
  }

  if (!isRequired(email)) {
    errors.email = 'Enter your email';
  } else if (!isEmail(email)) {
    errors.email = 'Enter a valid email';
  } else if (await usersRepository.emailExists(email.trim())) {
    errors.email = 'Email is already registered';
  }

  if (!isPositiveInt(positionId) || !(await lookupsRepository.positionExists(Number(positionId)))) {
    errors.positionId = 'Select your position';
  }

  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `At least ${MIN_PASSWORD_LENGTH} characters`;
  }

  if (confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match';
  }

  throwIfInvalid(errors);

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  return db.transaction(async (trx) => {
    const userId = await usersRepository.create(
      {
        full_name: fullName.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        position_id: Number(positionId),
        password_hash: passwordHash,
        status: USER_STATUS.PENDING,
      },
      trx,
    );

    const user = await usersRepository.findById(userId, trx);

    await auditLogsRepository.create(
      {
        userId,
        action: AUDIT_ACTIONS.CREATE,
        entityType: ENTITY_TYPES.USER,
        entityId: userId,
        after: user,
        ipAddress,
      },
      trx,
    );

    const adminIds = await usersRepository.listActiveIdsByRole(ROLES.ADMIN, trx);

    await notificationsRepository.createForUsers(
      adminIds,
      {
        type: NOTIFICATION_TYPES.ACCOUNT_REGISTERED,
        title: 'New account awaiting approval',
        message: `${user.fullName} (${user.positionName}) registered and needs a role.`,
        link: '/users',
      },
      trx,
    );

    return user;
  });
};

/**
 * Signs a JWT for the auth cookie.
 * @param {number} userId - User ID.
 * @returns {string} Signed token.
 */
const signToken = (userId) =>
  jwt.sign({ sub: String(userId) }, ENV.jwtSecret, { expiresIn: ENV.jwtExpiresIn });

/**
 * Verifies an auth cookie token.
 * @param {string} token - JWT from the cookie.
 * @returns {number | null} User ID, or null when the token is invalid or expired.
 */
export const verifyToken = (token) => {
  try {
    return Number(jwt.verify(token, ENV.jwtSecret).sub);
  } catch {
    return null;
  }
};

/**
 * Checks credentials and returns the user plus a token for the httpOnly cookie.
 * @param {{ username?: string, password?: string }} payload - Request body.
 * @param {string} ipAddress - Client IP for the audit log.
 * @returns {Promise<{ user: import('../repositories/users.repository.js').UserRecord, token: string }>} User and token.
 * @throws {AppError} 400 when fields are missing, 401 for wrong credentials, 403 when the account can't sign in.
 */
export const login = async (payload, ipAddress) => {
  const { username = '', password = '' } = payload;
  const errors = {};

  if (!isRequired(username)) {
    errors.username = 'Enter your username';
  }

  if (typeof password !== 'string' || !password) {
    errors.password = 'Enter your password';
  }

  throwIfInvalid(errors);

  const account = await usersRepository.findWithPasswordByUsername(username.trim());
  const passwordMatches = account ? await bcrypt.compare(password, account.passwordHash) : false;

  if (!account || !passwordMatches) {
    throw new AppError(INVALID_CREDENTIALS, 401);
  }

  if (STATUS_MESSAGES[account.status]) {
    throw new AppError(STATUS_MESSAGES[account.status], 403);
  }

  await usersRepository.update(account.id, { last_login_at: db.fn.now() });

  await auditLogsRepository.create({
    userId: account.id,
    action: AUDIT_ACTIONS.LOGIN,
    entityType: ENTITY_TYPES.USER,
    entityId: account.id,
    ipAddress,
  });

  const user = await usersRepository.findById(account.id);

  return { user, token: signToken(account.id) };
};

/**
 * Records a sign-out in the audit log.
 * @param {number} userId - User ID.
 * @param {string} ipAddress - Client IP.
 * @returns {Promise<void>}
 */
export const recordLogout = async (userId, ipAddress) => {
  await auditLogsRepository.create({
    userId,
    action: AUDIT_ACTIONS.LOGOUT,
    entityType: ENTITY_TYPES.USER,
    entityId: userId,
    ipAddress,
  });
};

/**
 * Loads an active user for the auth middleware.
 * @param {number} userId - User ID from the token.
 * @returns {Promise<import('../repositories/users.repository.js').UserRecord | null>} Active user, or null.
 */
export const findActiveUser = async (userId) => {
  const user = await usersRepository.findById(userId);

  return user && user.status === USER_STATUS.ACTIVE ? user : null;
};

/**
 * Changes the signed-in user's password and clears `must_change_password`.
 * @param {number} userId - Signed-in user ID.
 * @param {{ currentPassword?: string, newPassword?: string, confirmPassword?: string }} payload - Request body.
 * @param {string} ipAddress - Client IP.
 * @returns {Promise<import('../repositories/users.repository.js').UserRecord>} Updated user.
 * @throws {AppError} 400 with field errors.
 */
export const changePassword = async (userId, payload, ipAddress) => {
  const { currentPassword = '', newPassword = '', confirmPassword = '' } = payload;
  const errors = {};
  const currentHash = await usersRepository.findPasswordHashById(userId);

  if (!currentPassword) {
    errors.currentPassword = 'Enter your current password';
  } else if (!(await bcrypt.compare(currentPassword, currentHash))) {
    errors.currentPassword = 'Current password is incorrect';
  }

  if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = `At least ${MIN_PASSWORD_LENGTH} characters`;
  } else if (newPassword === currentPassword) {
    errors.newPassword = 'Choose a password different from the current one';
  }

  if (confirmPassword !== newPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  throwIfInvalid(errors);

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await db.transaction(async (trx) => {
    await usersRepository.update(
      userId,
      { password_hash: passwordHash, must_change_password: false, updated_by: userId },
      trx,
    );

    await auditLogsRepository.create(
      {
        userId,
        action: AUDIT_ACTIONS.PASSWORD_CHANGE,
        entityType: ENTITY_TYPES.USER,
        entityId: userId,
        ipAddress,
      },
      trx,
    );
  });

  return usersRepository.findById(userId);
};
