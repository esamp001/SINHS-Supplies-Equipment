import { db } from '../config/db.js';

/**
 * Data access for the simple master data lists: categories, units, locations and positions.
 * Each resource maps to a table, its extra text column (if any) and where it is used.
 */
const TABLES = Object.freeze({
  categories: {
    table: 'categories',
    extraColumn: 'description',
    usedIn: { table: 'items', column: 'category_id' },
  },
  units: {
    table: 'units',
    extraColumn: 'abbreviation',
    usedIn: { table: 'items', column: 'unit_id' },
  },
  locations: {
    table: 'locations',
    extraColumn: 'description',
    usedIn: { table: 'items', column: 'location_id' },
  },
  positions: {
    table: 'positions',
    extraColumn: null,
    usedIn: { table: 'users', column: 'position_id' },
  },
});

/**
 * @typedef {'categories' | 'units' | 'locations' | 'positions'} MasterDataResource
 */

/**
 * @typedef {Object} MasterDataRecord
 * @property {number} id - Record ID.
 * @property {string} name - Display name.
 * @property {string | null} description - Description (categories, locations).
 * @property {string | null} abbreviation - Short label (units).
 * @property {boolean} isActive - False when deactivated (hidden from dropdowns).
 * @property {number} usageCount - Items (or users, for positions) that use this record.
 * @property {string} updatedAt - ISO timestamp.
 */

/**
 * Lists the resource keys this repository supports.
 * @returns {MasterDataResource[]} Resource keys.
 */
export const listResourceKeys = () => Object.keys(TABLES);

/**
 * Maps a database row to the API shape.
 * @param {MasterDataResource} resource - Resource key.
 * @param {Object | undefined} row - Database row.
 * @returns {MasterDataRecord | null} Record, or null.
 */
const toRecord = (resource, row) => {
  if (!row) {
    return null;
  }

  const { extraColumn } = TABLES[resource];

  return {
    id: row.id,
    name: row.name,
    description: extraColumn === 'description' ? row.description : null,
    abbreviation: extraColumn === 'abbreviation' ? row.abbreviation : null,
    isActive: row.is_active,
    usageCount: Number(row.usage_count || 0),
    updatedAt: row.updated_at,
  };
};

/**
 * Base select for a resource, including how many rows use each record.
 * @param {MasterDataResource} resource - Resource key.
 * @param {import('knex').Knex} trx - Knex instance or transaction.
 * @returns {import('knex').Knex.QueryBuilder} Query builder.
 */
const baseQuery = (resource, trx) => {
  const { table, extraColumn, usedIn } = TABLES[resource];
  const columns = [`${table}.id`, `${table}.name`, `${table}.is_active`, `${table}.updated_at`];

  if (extraColumn) {
    columns.push(`${table}.${extraColumn}`);
  }

  const usageCount = trx(usedIn.table)
    .count('*')
    .whereRaw('??.?? = ??.id', [usedIn.table, usedIn.column, table])
    .whereNull(`${usedIn.table}.deleted_at`)
    .as('usage_count');

  return trx(table)
    .select([...columns, usageCount])
    .whereNull(`${table}.deleted_at`);
};

/**
 * Lists all (not deleted) records of a resource ordered by name.
 * @param {MasterDataResource} resource - Resource key.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<MasterDataRecord[]>} Records.
 */
export const list = async (resource, trx = db) =>
  (await baseQuery(resource, trx).orderBy('name')).map((row) => toRecord(resource, row));

/**
 * Finds one record by ID.
 * @param {MasterDataResource} resource - Resource key.
 * @param {number} id - Record ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<MasterDataRecord | null>} Record or null.
 */
export const findById = async (resource, id, trx = db) =>
  toRecord(
    resource,
    await baseQuery(resource, trx).where(`${TABLES[resource].table}.id`, id).first(),
  );

/**
 * Locks a record row for update (use inside a transaction).
 * @param {MasterDataResource} resource - Resource key.
 * @param {number} id - Record ID.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<MasterDataRecord | null>} Record or null.
 */
export const findByIdForUpdate = async (resource, id, trx) => {
  await trx(TABLES[resource].table).select('id').where({ id }).forUpdate();

  return findById(resource, id, trx);
};

/**
 * Checks whether another record already has this name (case-insensitive, deleted rows included
 * because the database UNIQUE constraint includes them).
 * @param {MasterDataResource} resource - Resource key.
 * @param {string} name - Name to check.
 * @param {number | null} excludeId - Record to ignore (when renaming).
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<boolean>} True when taken.
 */
export const nameExists = async (resource, name, excludeId, trx = db) => {
  const query = trx(TABLES[resource].table).whereRaw('lower(name) = lower(?)', [name]);

  if (excludeId) {
    query.whereNot('id', excludeId);
  }

  return Boolean(await query.first('id'));
};

/**
 * Inserts a record.
 * @param {MasterDataResource} resource - Resource key.
 * @param {Object} data - Snake_case column values.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number>} New record ID.
 */
export const create = async (resource, data, trx = db) => {
  const [row] = await trx(TABLES[resource].table).insert(data).returning('id');

  return row.id;
};

/**
 * Updates a record and bumps updated_at.
 * @param {MasterDataResource} resource - Resource key.
 * @param {number} id - Record ID.
 * @param {Object} data - Snake_case column values.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<void>}
 */
export const update = async (resource, id, data, trx = db) => {
  await trx(TABLES[resource].table)
    .where({ id })
    .update({ ...data, updated_at: trx.fn.now() });
};

/**
 * Soft-deletes a record.
 * @param {MasterDataResource} resource - Resource key.
 * @param {number} id - Record ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<void>}
 */
export const softDelete = async (resource, id, trx = db) => {
  await trx(TABLES[resource].table)
    .where({ id })
    .update({ deleted_at: trx.fn.now(), updated_at: trx.fn.now() });
};
