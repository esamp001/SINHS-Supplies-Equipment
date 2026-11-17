/**
 * Expected application error with an HTTP status and optional field errors (AGENTS.md §7).
 * Services throw it; the global error handler turns it into the standard response envelope.
 */
export class AppError extends Error {
  /**
   * Creates an AppError.
   * @param {string} message - Message safe to show to the user.
   * @param {number} [statusCode=400] - HTTP status code.
   * @param {Object<string, string>} [errors] - Field errors, e.g. `{ username: 'Already taken' }`.
   */
  constructor(message, statusCode = 400, errors) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

/**
 * Throws a 400 validation error when the errors object has any entries.
 * @param {Object<string, string>} errors - Field errors collected by a service.
 * @returns {void}
 * @throws {AppError} 400 with the field errors.
 */
export const throwIfInvalid = (errors) => {
  if (Object.keys(errors).length) {
    throw new AppError('Validation failed', 400, errors);
  }
};
