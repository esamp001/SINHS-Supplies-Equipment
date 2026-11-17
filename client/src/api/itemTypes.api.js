import { request } from './httpClient.js';

/**
 * Lists item types with their custom fields.
 * @param {{ activeOnly?: boolean }} [params] - `activeOnly` for dropdowns.
 * @returns {Promise<import('../utils/types.js').ItemType[]>} Item types.
 */
export const listItemTypes = (params) => request('/item-types', { params });

/**
 * Creates an item type (Admin / Custodian).
 * @param {{ name: string, kind: string, trackingMode: string, maxBorrowDays: number | null }} payload - Values.
 * @returns {Promise<import('../utils/types.js').ItemType>} Created item type.
 */
export const createItemType = (payload) =>
  request('/item-types', { method: 'POST', body: payload });

/**
 * Updates an item type (Admin / Custodian).
 * @param {number} id - Item type ID.
 * @param {{ name: string, kind: string, trackingMode: string, maxBorrowDays: number | null, isActive?: boolean }} payload - Values.
 * @returns {Promise<import('../utils/types.js').ItemType>} Updated item type.
 */
export const updateItemType = (id, payload) =>
  request(`/item-types/${id}`, { method: 'PUT', body: payload });

/**
 * Deletes an item type that no item uses (Admin / Custodian).
 * @param {number} id - Item type ID.
 * @returns {Promise<null>} Nothing.
 */
export const deleteItemType = (id) => request(`/item-types/${id}`, { method: 'DELETE' });

/**
 * Adds a custom field to an item type.
 * @param {number} itemTypeId - Item type ID.
 * @param {Object} payload - Field values (key, label, dataType, options, isRequired, appliesTo).
 * @returns {Promise<import('../utils/types.js').ItemType>} The item type with its fields.
 */
export const createItemTypeField = (itemTypeId, payload) =>
  request(`/item-types/${itemTypeId}/fields`, { method: 'POST', body: payload });

/**
 * Updates a custom field.
 * @param {number} itemTypeId - Item type ID.
 * @param {number} fieldId - Field ID.
 * @param {Object} payload - Field values (label, dataType, options, isRequired, sortOrder, isActive).
 * @returns {Promise<import('../utils/types.js').ItemType>} The item type with its fields.
 */
export const updateItemTypeField = (itemTypeId, fieldId, payload) =>
  request(`/item-types/${itemTypeId}/fields/${fieldId}`, { method: 'PUT', body: payload });

/**
 * Deletes a custom field that has no stored values.
 * @param {number} itemTypeId - Item type ID.
 * @param {number} fieldId - Field ID.
 * @returns {Promise<import('../utils/types.js').ItemType>} The item type with its remaining fields.
 */
export const deleteItemTypeField = (itemTypeId, fieldId) =>
  request(`/item-types/${itemTypeId}/fields/${fieldId}`, { method: 'DELETE' });
