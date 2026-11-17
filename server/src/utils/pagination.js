import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './constants.js';

/**
 * Helpers for list endpoints: page/pageSize parsing, whitelisted sorting and the `meta` block
 * of the response envelope (AGENTS.md §5).
 */

/**
 * @typedef {Object} Pagination
 * @property {number} page - 1-based page number.
 * @property {number} pageSize - Rows per page (1–100).
 * @property {number} offset - Rows to skip.
 */

/**
 * Reads `page` and `pageSize` from query parameters, falling back to safe defaults.
 * @param {{ page?: string | number, pageSize?: string | number }} query - Query parameters.
 * @returns {Pagination} Pagination values.
 */
export const parsePagination = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const requestedSize = Number.parseInt(query.pageSize, 10) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, requestedSize));

  return { page, pageSize, offset: (page - 1) * pageSize };
};

/**
 * Resolves `sortBy` / `sortOrder` against a whitelist so user input never reaches `orderBy`.
 * @param {{ sortBy?: string, sortOrder?: string }} query - Query parameters.
 * @param {Object<string, string>} allowedColumns - API sort key → database column.
 * @param {string} defaultKey - Sort key used when `sortBy` is missing or not allowed.
 * @param {'asc' | 'desc'} [defaultOrder='asc'] - Order used when `sortOrder` is missing.
 * @returns {{ column: string, order: 'asc' | 'desc' }} Safe sort.
 */
export const parseSort = (query, allowedColumns, defaultKey, defaultOrder = 'asc') => {
  const key = Object.hasOwn(allowedColumns, query.sortBy) ? query.sortBy : defaultKey;
  const order = ['asc', 'desc'].includes(query.sortOrder) ? query.sortOrder : defaultOrder;

  return { column: allowedColumns[key], order };
};

/**
 * Builds the `meta` block for a paginated response.
 * @param {Pagination} pagination - Pagination values.
 * @param {number} total - Total matching rows.
 * @returns {{ page: number, pageSize: number, total: number }} Meta.
 */
export const buildMeta = (pagination, total) => ({
  page: pagination.page,
  pageSize: pagination.pageSize,
  total,
});
