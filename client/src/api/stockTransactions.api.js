import { request } from './httpClient.js';

/**
 * Lists stock ledger entries, newest first (Admin / Custodian).
 * @param {{ page?: number, pageSize?: number, itemId?: number, type?: string, dateFrom?: string, dateTo?: string, search?: string }} [params] - Filters.
 * @returns {Promise<{ data: import('../utils/types.js').StockTransaction[], meta: import('../utils/types.js').PageMeta }>} Page of entries.
 */
export const listStockTransactions = (params) =>
  request('/stock-transactions', { params, withMeta: true });

/**
 * Records a stock-in for a quantity-tracked item.
 * @param {{ itemId: number, quantity: number, remarks?: string }} payload - Stock-in values.
 * @returns {Promise<import('../utils/types.js').Item>} Updated item.
 */
export const recordStockIn = (payload) =>
  request('/stock-transactions/stock-in', { method: 'POST', body: payload });

/**
 * Records a signed stock adjustment with a reason.
 * @param {{ itemId: number, quantity: number, remarks: string }} payload - Adjustment values.
 * @returns {Promise<import('../utils/types.js').Item>} Updated item.
 */
export const recordAdjustment = (payload) =>
  request('/stock-transactions/adjustments', { method: 'POST', body: payload });

/**
 * Lists items whose quantity on hand doesn't match the ledger (empty = all good).
 * @returns {Promise<Array<{ id: number, code: string, name: string, quantityOnHand: number, ledgerQuantity: number, availableUnits: number | null }>>} Mismatches.
 */
export const getReconciliation = () => request('/stock-transactions/reconciliation');
