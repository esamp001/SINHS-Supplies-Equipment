import * as lookupsRepository from '../repositories/lookups.repository.js';

/**
 * Lists active school positions (public: used by the registration form).
 * @returns {Promise<Array<{ id: number, name: string }>>} Positions.
 */
export const listPositions = async () => lookupsRepository.listActivePositions();
