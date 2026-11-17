import { db } from '../config/db.js';

/**
 * Lists active positions ordered by name.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<Array<{ id: number, name: string }>>} Positions.
 */
export const listActivePositions = async (trx = db) =>
  trx('positions')
    .select('id', 'name')
    .where({ is_active: true })
    .whereNull('deleted_at')
    .orderBy('id');

/**
 * Checks that an active position exists.
 * @param {number} id - Position ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<boolean>} True when it exists.
 */
export const positionExists = async (id, trx = db) =>
  Boolean(
    await trx('positions').where({ id, is_active: true }).whereNull('deleted_at').first('id'),
  );

/**
 * Finds a role ID by its code.
 * @param {string} code - Role code.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number | null>} Role ID or null.
 */
export const findRoleIdByCode = async (code, trx = db) => {
  const row = await trx('roles').select('id').where({ code }).first();

  return row ? row.id : null;
};
