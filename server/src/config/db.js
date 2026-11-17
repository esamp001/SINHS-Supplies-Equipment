import knex from 'knex';

import knexConfig from '../../knexfile.js';

/**
 * Shared Knex instance. Repositories use it by default and accept a `trx` override.
 * @type {import('knex').Knex}
 */
export const db = knex(knexConfig);
