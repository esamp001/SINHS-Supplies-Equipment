import { API_BASE_PATH } from '../utils/constants.js';
import { handleMockRequest } from '../mocks/mockServer.js';

/**
 * Base HTTP client built on native fetch (AGENTS.md §4.4).
 * - Sends the httpOnly auth cookie with `credentials: 'include'`.
 * - Parses the standard `{ success, data, meta, message, errors }` envelope.
 * - Uses the in-browser mock API while VITE_USE_MOCKS is not "false".
 */

const API_URL = import.meta.env.VITE_API_URL || '';
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

/** Handler called on 401 responses (set by the auth provider). */
let unauthorizedHandler = () => {};

/**
 * Error thrown for failed API calls.
 */
export class ApiError extends Error {
  /**
   * Creates an ApiError.
   * @param {string} message - Error message from the server.
   * @param {number} status - HTTP status code.
   * @param {Object<string, string>} [errors] - Field errors.
   */
  constructor(message, status, errors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors || {};
  }
}

/**
 * Registers the function called when any request returns 401.
 * @param {() => void} handler - Callback, e.g. clears auth state and redirects to login.
 * @returns {void}
 */
export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

/**
 * Builds a full URL with query parameters, skipping null/undefined/empty values.
 * @param {string} path - Path relative to the API base, e.g. "/users".
 * @param {Object<string, *>} [params] - Query parameters.
 * @returns {string} Full URL.
 */
const buildUrl = (path, params) => {
  const url = new URL(`${API_URL}${API_BASE_PATH}${path}`, window.location.origin);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
};

/**
 * Converts query params to a string map for the mock server.
 * @param {Object<string, *>} [params] - Query parameters.
 * @returns {Object<string, string>} String map.
 */
const toQueryMap = (params) =>
  Object.fromEntries(
    Object.entries(params || {})
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, String(value)]),
  );

/**
 * Performs the request against the mock API or the real API.
 * @param {string} path - Path relative to the API base.
 * @param {{ method: string, body?: Object, params?: Object, signal?: AbortSignal }} options - Request options.
 * @returns {Promise<{ status: number, json: import('../utils/types.js').ApiResponse }>} Status and parsed body.
 */
const send = async (path, { method, body, params, signal }) => {
  if (USE_MOCKS) {
    return handleMockRequest({ method, path, query: toQueryMap(params), body });
  }
  const response = await fetch(buildUrl(path, params), {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, json };
};

/**
 * Sends an API request and returns the parsed envelope.
 * @param {string} path - Path relative to the API base, e.g. "/auth/me".
 * @param {{ method?: string, body?: Object, params?: Object, signal?: AbortSignal, skipUnauthorizedHandler?: boolean }} [options] - Request options.
 * @returns {Promise<import('../utils/types.js').ApiResponse>} Response envelope.
 * @throws {ApiError} When the response is not successful.
 */
export const request = async (path, options = {}) => {
  const { method = 'GET', body, params, signal, skipUnauthorizedHandler = false } = options;
  const { status, json } = await send(path, { method, body, params, signal });

  if (status === 401 && !skipUnauthorizedHandler) unauthorizedHandler();
  if (status < 200 || status >= 300 || json.success === false) {
    throw new ApiError(
      json.message || 'Something went wrong. Please try again.',
      status,
      json.errors,
    );
  }
  return json;
};
