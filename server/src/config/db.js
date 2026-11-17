import knex from 'knex';
import pg from 'pg';

import knexConfig from '../../knexfile.js';

// Return PostgreSQL DATE columns as plain 'YYYY-MM-DD' strings instead of JS Date objects,
// so date-only values (e.g. needed_at) never shift by a day because of timezones.
const PG_DATE_TYPE_ID = 1082;

pg.types.setTypeParser(PG_DATE_TYPE_ID, (value) => value);

/**
 * Shared Knex instance. Repositories use it by default and accept a `trx` override.
 * @type {import('knex').Knex}
 */
export const db = knex(knexConfig);
