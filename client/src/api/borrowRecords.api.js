import { request } from './httpClient.js';

/**
 * Lists borrow records. Staff get only their own.
 * @param {{ page?: number, pageSize?: number, status?: 'borrowed' | 'returned' | 'overdue', search?: string }} [params] - Filters.
 * @returns {Promise<{ data: import('../utils/types.js').BorrowRecord[], meta: import('../utils/types.js').PageMeta }>} Page of records.
 */
export const listBorrowRecords = (params) => request('/borrow-records', { params, withMeta: true });

/**
 * Gets a borrow record with its items.
 * @param {number} id - Borrow record ID.
 * @returns {Promise<import('../utils/types.js').BorrowRecord & { items: import('../utils/types.js').BorrowRecordItem[] }>} Record detail.
 */
export const getBorrowRecord = (id) => request(`/borrow-records/${id}`);

/**
 * Records the return of some or all items with their condition (Custodian / Admin).
 * @param {number} id - Borrow record ID.
 * @param {{ items: Array<{ borrowRecordItemId: number, condition: string, remarks?: string }> }} payload - Returned items.
 * @returns {Promise<import('../utils/types.js').BorrowRecord>} Updated record.
 */
export const returnBorrowedItems = (id, payload) =>
  request(`/borrow-records/${id}/return`, { method: 'POST', body: payload });
