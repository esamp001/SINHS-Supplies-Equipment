import { request } from './httpClient.js';

/**
 * Lists items with filters, sorting and pagination.
 * @param {{ page?: number, pageSize?: number, search?: string, sortBy?: string, sortOrder?: 'asc' | 'desc', itemTypeId?: number, categoryId?: number, locationId?: number, kind?: string, lowStockOnly?: boolean, availableOnly?: boolean }} [params] - Filters.
 * @returns {Promise<{ data: import('../utils/types.js').Item[], meta: import('../utils/types.js').PageMeta }>} Page of items.
 */
export const listItems = (params) => request('/items', { params, withMeta: true });

/**
 * Gets an item with its type's fields and (for unit-tracked items) its units.
 * @param {number} id - Item ID.
 * @returns {Promise<import('../utils/types.js').Item & { fields: import('../utils/types.js').ItemTypeField[], units: import('../utils/types.js').ItemUnit[] }>} Item detail.
 */
export const getItem = (id) => request(`/items/${id}`);

/**
 * Creates an item (Admin / Custodian).
 * @param {Object} payload - Item values (code, name, itemTypeId, unitId, categoryId, locationId, reorderLevel, openingQuantity, attributes).
 * @returns {Promise<import('../utils/types.js').Item>} Created item.
 */
export const createItem = (payload) => request('/items', { method: 'POST', body: payload });

/**
 * Updates an item's details (Admin / Custodian).
 * @param {number} id - Item ID.
 * @param {Object} payload - Item values.
 * @returns {Promise<import('../utils/types.js').Item>} Updated item.
 */
export const updateItem = (id, payload) =>
  request(`/items/${id}`, { method: 'PUT', body: payload });

/**
 * Deletes an item with no stock and no open activity (Admin / Custodian).
 * @param {number} id - Item ID.
 * @returns {Promise<null>} Nothing.
 */
export const deleteItem = (id) => request(`/items/${id}`, { method: 'DELETE' });

/**
 * Registers a new unit of a unit-tracked item.
 * @param {number} itemId - Item ID.
 * @param {{ propertyNo: string, serialNo?: string, condition?: string, attributes?: Object }} payload - Unit values.
 * @returns {Promise<import('../utils/types.js').ItemUnit[]>} The item's units.
 */
export const addItemUnit = (itemId, payload) =>
  request(`/items/${itemId}/units`, { method: 'POST', body: payload });

/**
 * Updates a unit's details.
 * @param {number} itemId - Item ID.
 * @param {number} unitId - Unit ID.
 * @param {{ propertyNo: string, serialNo?: string, condition?: string, attributes?: Object }} payload - Unit values.
 * @returns {Promise<import('../utils/types.js').ItemUnit[]>} The item's units.
 */
export const updateItemUnit = (itemId, unitId, payload) =>
  request(`/items/${itemId}/units/${unitId}`, { method: 'PUT', body: payload });

/**
 * Changes a unit's status by hand (available, under repair, lost, disposed) with a reason.
 * @param {number} itemId - Item ID.
 * @param {number} unitId - Unit ID.
 * @param {{ status: string, remarks: string }} payload - New status and reason.
 * @returns {Promise<import('../utils/types.js').ItemUnit[]>} The item's units.
 */
export const changeItemUnitStatus = (itemId, unitId, payload) =>
  request(`/items/${itemId}/units/${unitId}/status`, { method: 'POST', body: payload });
