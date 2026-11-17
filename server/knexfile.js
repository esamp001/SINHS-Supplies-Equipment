import { ENV } from './src/config/env.js';

/**
 * Knex configuration (migrations, seeds, connection).
 * Default export is required by the Knex CLI (allowed exception in AGENTS.md §12.3).
 * @type {import('knex').Knex.Config}
 */
export default {
  client: 'pg',
  connection: ENV.db,
  pool: {
    min: 0,
    max: 10,
    /**
     * Sets the session timezone to Asia/Manila on every new connection (AGENTS.md §8).
     * @param {import('pg').Client} connection - Raw pg connection.
     * @param {(error: Error | null, connection: import('pg').Client) => void} done - Callback.
     * @returns {void}
     */
    afterCreate: (connection, done) => {
      connection.query("SET timezone = 'Asia/Manila'", (error) => done(error, connection));
    },
  },
  migrations: { directory: './db/migrations', loadExtensions: ['.js'] },
  seeds: { directory: './db/seeds', loadExtensions: ['.js'] },
};
