import { APP_TIMEZONE } from './constants.js';

/**
 * Date helpers that work in the app timezone (Asia/Manila, AGENTS.md §8).
 */

/** Formats dates as 'YYYY-MM-DD' in Manila ('en-CA' uses that order). */
const MANILA_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Formats timestamps as 'Nov 18, 2026, 3:45 PM' in Manila. */
const MANILA_DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/**
 * Returns a date as 'YYYY-MM-DD' in Manila.
 * @param {Date} [date=new Date()] - Date to format.
 * @returns {string} Manila calendar date.
 */
export const toManilaDate = (date = new Date()) => MANILA_DATE_FORMAT.format(date);

/**
 * Adds whole days to a 'YYYY-MM-DD' date.
 * @param {string} dateString - Start date.
 * @param {number} days - Days to add (may be negative).
 * @returns {string} Resulting date as 'YYYY-MM-DD'.
 */
export const addDays = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00Z`);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
};

/**
 * Counts the days from one 'YYYY-MM-DD' date to another.
 * @param {string} fromDate - Start date.
 * @param {string} toDate - End date.
 * @returns {number} Whole days (negative when `toDate` is earlier).
 */
export const daysBetween = (fromDate, toDate) =>
  Math.round((new Date(`${toDate}T00:00:00Z`) - new Date(`${fromDate}T00:00:00Z`)) / 86400000);

/**
 * Formats a timestamp as a readable Manila date and time (used in report exports).
 * @param {Date | string | null | undefined} value - Timestamp.
 * @returns {string} Formatted value, or an empty string.
 */
export const formatManilaDateTime = (value) =>
  value ? MANILA_DATE_TIME_FORMAT.format(new Date(value)) : '';

/**
 * Formats a timestamp as a Manila 'YYYY-MM-DD' date (used in report exports).
 * @param {Date | string | null | undefined} value - Timestamp or date string.
 * @returns {string} Formatted value, or an empty string.
 */
export const formatManilaDate = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return toManilaDate(new Date(value));
};
