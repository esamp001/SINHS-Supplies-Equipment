import { app } from './app.js';
import { db } from './config/db.js';
import { ENV } from './config/env.js';

/**
 * Checks the database connection, then starts the HTTP server.
 * @returns {Promise<void>}
 */
const start = async () => {
  try {
    await db.raw('select 1');
  } catch (error) {
    console.error(
      'Could not connect to PostgreSQL. Check DB_* values in server/.env.',
      error.message,
    );

    process.exit(1);
  }

  app.listen(ENV.port, () => {
    console.warn(`SINHS API listening on http://localhost:${ENV.port}/api/v1`);
  });
};

start();
