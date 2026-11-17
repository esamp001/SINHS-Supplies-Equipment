/**
 * Base HTTP client built on native fetch (AGENTS.md §4.4).
 * - Sends the httpOnly auth cookie with `credentials: 'include'`.
 * - Parses the standard `{ success, data, message, errors }` envelope.
 * - Calls the registered handler on 401 so the app can return to the login page.
 */

const API_BASE_URL = `${import.meta.env.VITE_API_URL || ''}/api/v1`;

/** Handler called on 401 responses (set by AuthProvider). */
let unauthorizedHandler = () => {};

/**
 * Error thrown for failed API calls.
 */
export class ApiError extends Error {
  /**
   * Creates an ApiError.
   * @param {string} message - Message from the server.
   * @param {number} status - HTTP status code.
   * @param {Object<string, string>} [errors] - Field errors, e.g. `{ username: 'Already taken' }`.
   */
  constructor(message, status, errors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors || {};
  }
}

/**
 * Registers the function called when a request returns 401.
 * @param {() => void} handler - Callback, e.g. clears the signed-in user.
 * @returns {void}
 */
export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

/**
 * Builds the request URL with query parameters (skips empty values).
 * @param {string} path - Path relative to /api/v1, e.g. "/users".
 * @param {Object<string, *>} [params] - Query parameters.
 * @returns {string} URL.
 */
const buildUrl = (path, params) => {
  const query = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();

  return `${API_BASE_URL}${path}${queryString ? `?${queryString}` : ''}`;
};

/**
 * Sends an API request and returns the `data` from the response envelope.
 * @param {string} path - Path relative to /api/v1, e.g. "/auth/me".
 * @param {{ method?: string, body?: Object, params?: Object, skipUnauthorizedHandler?: boolean }} [options] - Request options.
 * @returns {Promise<*>} Response data.
 * @throws {ApiError} When the request fails or the server returns `success: false`.
 */
export const request = async (path, options = {}) => {
  const { method = 'GET', body, params, skipUnauthorizedHandler = false } = options;
  let response;

  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Is the API running?', 0);
  }

  const json = await response.json().catch(() => ({}));

  if (response.status === 401 && !skipUnauthorizedHandler) {
    unauthorizedHandler();
  }

  if (!response.ok || json.success === false) {
    throw new ApiError(
      json.message || 'Something went wrong. Please try again.',
      response.status,
      json.errors,
    );
  }

  return json.data;
};
