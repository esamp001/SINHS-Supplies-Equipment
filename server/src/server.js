import cron from 'node-cron';

import { app } from './app.js';
import { db } from './config/db.js';
import { ENV } from './config/env.js';
import { sendBorrowReminders } from './services/borrowRecords.service.js';
import { APP_TIMEZONE } from './utils/constants.js';

/** Daily borrow reminder check: every day at 7:00 AM Manila time (AGENTS.md §9). */
const BORROW_REMINDER_SCHEDULE = '0 7 * * *';

/**
 * Runs the borrow reminder check and logs failures instead of crashing the server.
 * Safe to run any number of times (reminders are de-duplicated).
 * @returns {Promise<void>}
 */
const runBorrowReminders = async () => {
  try {
    await sendBorrowReminders();
  } catch (error) {
    console.error('Borrow reminder check failed:', error.message);
  }
};

/**
 * Checks the database connection, then starts the HTTP server and the daily reminder job.
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

  cron.schedule(BORROW_REMINDER_SCHEDULE, runBorrowReminders, { timezone: APP_TIMEZONE });
  await runBorrowReminders();
};

start();
