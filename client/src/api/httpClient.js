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
 * @typedef {Error & { status: number, errors: Object<string, string> }} ApiError
 */

/**
 * Creates the error thrown for failed API calls. Plain function — no classes (AGENTS.md §12.3).
 * Uses the built-in Error so the stack trace is kept.
 * @param {string} message - Message from the server.
 * @param {number} status - HTTP status code (0 when the server can't be reached).
 * @param {Object<string, string>} [errors] - Field errors, e.g. `{ username: 'Already taken' }`.
 * @returns {ApiError} Error to throw.
 */
export const createApiError = (message, status, errors) => {
  const error = new Error(message);

  error.name = 'ApiError';
  error.status = status;
  error.errors = errors || {};

  return error;
};

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
 * With `withMeta`, returns `{ data, meta }` instead (paginated lists).
 * @param {string} path - Path relative to /api/v1, e.g. "/auth/me".
 * @param {{ method?: string, body?: Object, params?: Object, skipUnauthorizedHandler?: boolean, withMeta?: boolean }} [options] - Request options.
 * @returns {Promise<*>} Response data, or `{ data, meta }` with `withMeta`.
 * @throws {ApiError} When the request fails or the server returns `success: false`.
 */
export const request = async (path, options = {}) => {
  const {
    method = 'GET',
    body,
    params,
    skipUnauthorizedHandler = false,
    withMeta = false,
  } = options;

  let response;

  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw createApiError('Cannot reach the server. Is the API running?', 0);
  }

  const json = await response.json().catch(() => ({}));

  if (response.status === 401 && !skipUnauthorizedHandler) {
    unauthorizedHandler();
  }

  if (!response.ok || json.success === false) {
    throw createApiError(
      json.message || 'Something went wrong. Please try again.',
      response.status,
      json.errors,
    );
  }

  return withMeta ? { data: json.data, meta: json.meta } : json.data;
};

/**
 * Reads the file name from a Content-Disposition header.
 * @param {string | null} header - Header value.
 * @param {string} fallback - Name used when the header has none.
 * @returns {string} File name.
 */
const getFileName = (header, fallback) => {
  const match = /filename="?([^";]+)"?/i.exec(header || '');

  return match ? match[1] : fallback;
};

/**
 * Downloads a file (e.g. an Excel or PDF report) with the auth cookie and saves it through a
 * temporary object URL (AGENTS.md §5 report exports).
 * @param {string} path - Path relative to /api/v1.
 * @param {Object} [params] - Query parameters.
 * @param {string} [fallbackName='download'] - File name if the server doesn't send one.
 * @returns {Promise<void>}
 * @throws {ApiError} When the server returns an error.
 */
export const download = async (path, params, fallbackName = 'download') => {
  let response;

  try {
    response = await fetch(buildUrl(path, params), { credentials: 'include' });
  } catch {
    throw createApiError('Cannot reach the server. Is the API running?', 0);
  }

  if (response.status === 401) {
    unauthorizedHandler();
  }

  if (!response.ok) {
    const json = await response.json().catch(() => ({}));

    throw createApiError(json.message || 'Download failed.', response.status, json.errors);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = getFileName(response.headers.get('Content-Disposition'), fallbackName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};
