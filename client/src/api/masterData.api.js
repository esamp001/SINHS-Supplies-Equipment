import { request } from './httpClient.js';

/**
 * @typedef {'categories' | 'units' | 'locations' | 'positions'} MasterDataResource
 */

/**
 * Lists every record of a master data list (active and inactive).
 * @param {MasterDataResource} resource - List name.
 * @returns {Promise<import('../utils/types.js').MasterDataRecord[]>} Records.
 */
export const listMasterData = (resource) => request(`/master-data/${resource}`);

/**
 * Creates a master data record (Admin only).
 * @param {MasterDataResource} resource - List name.
 * @param {{ name: string, description?: string, abbreviation?: string }} payload - Values.
 * @returns {Promise<import('../utils/types.js').MasterDataRecord>} Created record.
 */
export const createMasterData = (resource, payload) =>
  request(`/master-data/${resource}`, { method: 'POST', body: payload });

/**
 * Updates a master data record, including its active flag (Admin only).
 * @param {MasterDataResource} resource - List name.
 * @param {number} id - Record ID.
 * @param {{ name: string, description?: string, abbreviation?: string, isActive?: boolean }} payload - Values.
 * @returns {Promise<import('../utils/types.js').MasterDataRecord>} Updated record.
 */
export const updateMasterData = (resource, id, payload) =>
  request(`/master-data/${resource}/${id}`, { method: 'PUT', body: payload });

/**
 * Deletes an unused master data record (Admin only).
 * @param {MasterDataResource} resource - List name.
 * @param {number} id - Record ID.
 * @returns {Promise<null>} Nothing.
 */
export const deleteMasterData = (resource, id) =>
  request(`/master-data/${resource}/${id}`, { method: 'DELETE' });
