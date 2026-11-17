/**
 * Reusable plain-JavaScript validation helpers (no Zod — AGENTS.md §6).
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,50}$/;

/**
 * Checks that a value is a non-empty string after trimming.
 * @param {*} value - Value to check.
 * @returns {boolean} True when present.
 */
export const isRequired = (value) => typeof value === 'string' && value.trim().length > 0;

/**
 * Checks for a valid email address.
 * @param {*} value - Value to check.
 * @returns {boolean} True when valid.
 */
export const isEmail = (value) => typeof value === 'string' && EMAIL_PATTERN.test(value.trim());

/**
 * Checks for a valid username: 3–50 letters, numbers, dots, underscores or hyphens.
 * @param {*} value - Value to check.
 * @returns {boolean} True when valid.
 */
export const isUsername = (value) =>
  typeof value === 'string' && USERNAME_PATTERN.test(value.trim());

/**
 * Checks for a positive whole number (also accepts numeric strings).
 * @param {*} value - Value to check.
 * @returns {boolean} True when a positive integer.
 */
export const isPositiveInt = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

/**
 * Checks that a value is one of the allowed options.
 * @param {*} value - Value to check.
 * @param {Array<*>} options - Allowed values.
 * @returns {boolean} True when allowed.
 */
export const isOneOf = (value, options) => options.includes(value);

/**
 * Checks for a whole number that is zero or more (also accepts numeric strings).
 * @param {*} value - Value to check.
 * @returns {boolean} True when a non-negative integer.
 */
export const isNonNegativeInt = (value) =>
  value !== '' && value !== null && Number.isInteger(Number(value)) && Number(value) >= 0;

/**
 * Checks for a whole number other than zero (positive or negative).
 * @param {*} value - Value to check.
 * @returns {boolean} True when a non-zero integer.
 */
export const isNonZeroInt = (value) =>
  value !== '' && value !== null && Number.isInteger(Number(value)) && Number(value) !== 0;

/**
 * Checks for a real calendar date in 'YYYY-MM-DD' format.
 * @param {*} value - Value to check.
 * @returns {boolean} True when valid.
 */
export const isValidDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

/**
 * Checks that a string is not longer than the given length (empty values pass).
 * @param {*} value - Value to check.
 * @param {number} maxLength - Maximum number of characters.
 * @returns {boolean} True when short enough.
 */
export const isMaxLength = (value, maxLength) =>
  value === undefined || value === null || String(value).length <= maxLength;
