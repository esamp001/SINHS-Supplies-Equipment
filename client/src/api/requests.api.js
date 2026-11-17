import { request } from './httpClient.js';

/**
 * Lists requests. Staff get only their own; reviewers can pass `mine` to see only theirs.
 * @param {{ page?: number, pageSize?: number, status?: string, requestType?: string, search?: string, mine?: boolean }} [params] - Filters (`status` may be comma-separated).
 * @returns {Promise<{ data: import('../utils/types.js').InventoryRequest[], meta: import('../utils/types.js').PageMeta }>} Page of requests.
 */
export const listRequests = (params) => request('/requests', { params, withMeta: true });

/**
 * Gets a request with its items (and, for reviewers releasing a borrow, the available units).
 * @param {number} id - Request ID.
 * @returns {Promise<import('../utils/types.js').InventoryRequest & { items: import('../utils/types.js').RequestItem[], borrowRecordId: number | null, availableUnits: Object<number, Array<{ id: number, propertyNo: string, serialNo: string | null }>> }>} Request detail.
 */
export const getRequest = (id) => request(`/requests/${id}`);

/**
 * Submits a supply or borrow request.
 * @param {{ requestType: string, purpose: string, neededAt: string, dueDate?: string, items: Array<{ itemId: number, quantity: number }> }} payload - Request values.
 * @returns {Promise<import('../utils/types.js').InventoryRequest>} Created request.
 */
export const createRequest = (payload) => request('/requests', { method: 'POST', body: payload });

/**
 * Cancels the signed-in user's pending request.
 * @param {number} id - Request ID.
 * @returns {Promise<import('../utils/types.js').InventoryRequest>} Updated request.
 */
export const cancelRequest = (id) => request(`/requests/${id}/cancel`, { method: 'POST' });

/**
 * Approves a pending request with per-item approved quantities.
 * @param {number} id - Request ID.
 * @param {{ items: Array<{ requestItemId: number, approvedQuantity: number, remarks?: string }>, dueDate?: string }} payload - Decisions.
 * @returns {Promise<import('../utils/types.js').InventoryRequest>} Updated request.
 */
export const approveRequest = (id, payload) =>
  request(`/requests/${id}/approve`, { method: 'POST', body: payload });

/**
 * Rejects a pending request with a reason.
 * @param {number} id - Request ID.
 * @param {string} reason - Required reason.
 * @returns {Promise<import('../utils/types.js').InventoryRequest>} Updated request.
 */
export const rejectRequest = (id, reason) =>
  request(`/requests/${id}/reject`, { method: 'POST', body: { reason } });

/**
 * Releases an approved request (deducts stock; borrow requests create a borrow record).
 * @param {number} id - Request ID.
 * @param {{ units?: Object<number, number[]> }} payload - Unit IDs per request item (unit-tracked equipment).
 * @returns {Promise<import('../utils/types.js').InventoryRequest>} Updated request.
 */
export const releaseRequest = (id, payload) =>
  request(`/requests/${id}/release`, { method: 'POST', body: payload });
