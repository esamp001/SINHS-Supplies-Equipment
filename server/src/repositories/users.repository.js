import { db } from '../config/db.js';

/** Public user columns (never includes password_hash). */
const USER_COLUMNS = [
  'users.id',
  'users.username',
  'users.email',
  'users.full_name',
  'users.status',
  'users.position_id',
  'positions.name as position_name',
  'roles.code as role_code',
  'users.must_change_password',
  'users.rejection_reason',
  'users.approved_at',
  'users.last_login_at',
  'users.created_at',
];

/**
 * @typedef {Object} UserRecord
 * @property {number} id - User ID.
 * @property {string} username - Username.
 * @property {string} email - Email.
 * @property {string} fullName - Full name.
 * @property {'pending' | 'active' | 'rejected' | 'deactivated'} status - Account status.
 * @property {number} positionId - Position ID.
 * @property {string} positionName - Position name.
 * @property {string | null} roleCode - Role code (null while pending).
 * @property {boolean} mustChangePassword - True after an admin password reset.
 * @property {string | null} rejectionReason - Reason when rejected.
 * @property {string | null} approvedAt - ISO timestamp.
 * @property {string | null} lastLoginAt - ISO timestamp.
 * @property {string} createdAt - ISO timestamp.
 */

/**
 * Maps a snake_case database row to the camelCase API shape.
 * @param {Object | undefined} row - Database row.
 * @returns {UserRecord | null} Mapped user, or null.
 */
const toUser = (row) =>
  row
    ? {
        id: row.id,
        username: row.username,
        email: row.email,
        fullName: row.full_name,
        status: row.status,
        positionId: row.position_id,
        positionName: row.position_name,
        roleCode: row.role_code,
        mustChangePassword: row.must_change_password,
        rejectionReason: row.rejection_reason,
        approvedAt: row.approved_at,
        lastLoginAt: row.last_login_at,
        createdAt: row.created_at,
      }
    : null;

/**
 * Base query joining roles and positions, excluding soft-deleted users.
 * @param {import('knex').Knex} trx - Knex instance or transaction.
 * @returns {import('knex').Knex.QueryBuilder} Query builder.
 */
const baseQuery = (trx) =>
  trx('users')
    .leftJoin('roles', 'roles.id', 'users.role_id')
    .leftJoin('positions', 'positions.id', 'users.position_id')
    .whereNull('users.deleted_at');

/**
 * Finds a user by ID.
 * @param {number} id - User ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<UserRecord | null>} User or null.
 */
export const findById = async (id, trx = db) =>
  toUser(await baseQuery(trx).select(USER_COLUMNS).where('users.id', id).first());

/**
 * Finds a user by ID and locks the row for update (use inside a transaction).
 * @param {number} id - User ID.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<UserRecord | null>} User or null.
 */
export const findByIdForUpdate = async (id, trx) => {
  await trx('users').select('id').where({ id }).forUpdate();

  return findById(id, trx);
};

/**
 * Finds a user (including the password hash) by username, for sign-in.
 * @param {string} username - Username.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<(UserRecord & { passwordHash: string }) | null>} User with hash, or null.
 */
export const findWithPasswordByUsername = async (username, trx = db) => {
  const row = await baseQuery(trx)
    .select([...USER_COLUMNS, 'users.password_hash'])
    .whereRaw('lower(users.username) = lower(?)', [username])
    .first();

  return row ? { ...toUser(row), passwordHash: row.password_hash } : null;
};

/**
 * Returns the password hash of a user.
 * @param {number} id - User ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<string | null>} Password hash or null.
 */
export const findPasswordHashById = async (id, trx = db) => {
  const row = await trx('users').select('password_hash').where({ id }).first();

  return row ? row.password_hash : null;
};

/**
 * Checks whether a username is already used (case-insensitive).
 * @param {string} username - Username.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<boolean>} True when taken.
 */
export const usernameExists = async (username, trx = db) =>
  Boolean(await trx('users').whereRaw('lower(username) = lower(?)', [username]).first('id'));

/**
 * Checks whether an email is already used (case-insensitive).
 * @param {string} email - Email.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<boolean>} True when taken.
 */
export const emailExists = async (email, trx = db) =>
  Boolean(await trx('users').whereRaw('lower(email) = lower(?)', [email]).first('id'));

/**
 * Lists users with optional status filter and search.
 * @param {{ statuses: string[], search?: string }} filters - Filters.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<UserRecord[]>} Users ordered by newest first.
 */
export const list = async ({ statuses, search }, trx = db) => {
  const query = baseQuery(trx)
    .select(USER_COLUMNS)
    .whereIn('users.status', statuses)
    .orderBy('users.created_at', 'desc');

  if (search) {
    query.where((builder) =>
      builder
        .whereILike('users.full_name', `%${search}%`)
        .orWhereILike('users.username', `%${search}%`),
    );
  }

  return (await query).map(toUser);
};

/**
 * Lists IDs of active users with a given role (e.g. admins to notify).
 * @param {string} roleCode - Role code.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number[]>} User IDs.
 */
export const listActiveIdsByRole = async (roleCode, trx = db) =>
  (
    await trx('users')
      .join('roles', 'roles.id', 'users.role_id')
      .where({ 'roles.code': roleCode, 'users.status': 'active' })
      .whereNull('users.deleted_at')
      .select('users.id')
  ).map((row) => row.id);

/**
 * Inserts a user.
 * @param {Object} data - Snake_case column values.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number>} New user ID.
 */
export const create = async (data, trx = db) => {
  const [row] = await trx('users').insert(data).returning('id');

  return row.id;
};

/**
 * Updates a user and bumps updated_at.
 * @param {number} id - User ID.
 * @param {Object} data - Snake_case column values.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<void>}
 */
export const update = async (id, data, trx = db) => {
  await trx('users')
    .where({ id })
    .update({ ...data, updated_at: trx.fn.now() });
};
