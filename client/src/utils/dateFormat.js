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
