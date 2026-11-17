/**
 * Error helpers for expected application errors (AGENTS.md §7). Plain functions — no classes.
 * Services throw these; the global error handler turns them into the standard response envelope.
 */

/**
 * @typedef {Error & { isAppError: true, statusCode: number, errors?: Object<string, string> }} AppError
 */

/**
 * Creates an expected application error with an HTTP status and optional field errors.
 * Uses the built-in Error so the stack trace is kept.
 * @param {string} message - Message safe to show to the user.
 * @param {number} [statusCode=400] - HTTP status code.
 * @param {Object<string, string>} [errors] - Field errors, e.g. `{ username: 'Already taken' }`.
 * @returns {AppError} Error to throw.
 */
export const createAppError = (message, statusCode = 400, errors) => {
  const error = new Error(message);

  error.name = 'AppError';
  error.isAppError = true;
  error.statusCode = statusCode;
  error.errors = errors;

  return error;
};

/**
 * Checks whether an error was created with `createAppError` (safe to show to the user).
 * @param {*} error - Any thrown value.
 * @returns {boolean} True for application errors.
 */
export const isAppError = (error) => Boolean(error && error.isAppError);

/**
 * Throws a 400 validation error when the errors object has any entries.
 * @param {Object<string, string>} errors - Field errors collected by a service.
 * @returns {void}
 * @throws {AppError} 400 with the field errors.
 */
export const throwIfInvalid = (errors) => {
  if (Object.keys(errors).length) {
    throw createAppError('Validation failed', 400, errors);
  }
};
