import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import { APP_TIMEZONE } from './constants.js';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Formats an ISO timestamp as a date in Asia/Manila.
 * @param {string | null | undefined} value - ISO timestamp.
 * @param {string} [pattern='MMM D, YYYY'] - dayjs format pattern.
 * @returns {string} Formatted date, or an em dash when empty.
 */
export const formatDate = (value, pattern = 'MMM D, YYYY') =>
  value ? dayjs(value).tz(APP_TIMEZONE).format(pattern) : '—';

/**
 * Formats an ISO timestamp as date and time in Asia/Manila.
 * @param {string | null | undefined} value - ISO timestamp.
 * @returns {string} Formatted date/time, or an em dash when empty.
 */
export const formatDateTime = (value) => formatDate(value, 'MMM D, YYYY h:mm A');

/**
 * Returns today's date in Asia/Manila as 'YYYY-MM-DD'.
 * @returns {string} Manila calendar date.
 */
export const getManilaToday = () => dayjs().tz(APP_TIMEZONE).format('YYYY-MM-DD');

/**
 * Formats a date-only value ('YYYY-MM-DD', e.g. a request's needed date) without timezone
 * conversion, so it never shifts by a day.
 * @param {string | null | undefined} value - Date string.
 * @param {string} [pattern='MMM D, YYYY'] - dayjs format pattern.
 * @returns {string} Formatted date, or an em dash when empty.
 */
export const formatDateOnly = (value, pattern = 'MMM D, YYYY') =>
  value ? dayjs(value).format(pattern) : '—';
