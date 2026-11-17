import { db } from '../config/db.js';
import * as auditLogsRepository from '../repositories/auditLogs.repository.js';
import * as masterDataRepository from '../repositories/masterData.repository.js';
import { createAppError, throwIfInvalid } from '../utils/errors.js';
import { AUDIT_ACTIONS, ENTITY_TYPES } from '../utils/constants.js';
import { isMaxLength, isRequired } from '../utils/validators.js';

/**
 * @typedef {import('../repositories/masterData.repository.js').MasterDataResource} MasterDataResource
 * @typedef {import('../repositories/masterData.repository.js').MasterDataRecord} MasterDataRecord
 * @typedef {import('../utils/requestParsers.js').Actor} Actor
 */

/** Validation and audit settings per master data list. */
const RESOURCE_RULES = Object.freeze({
  categories: {
    label: 'Category',
    entityType: ENTITY_TYPES.CATEGORY,
    nameMaxLength: 100,
    extraField: { key: 'description', column: 'description', maxLength: 255 },
    usedBy: 'items',
  },
  units: {
    label: 'Unit',
    entityType: ENTITY_TYPES.UNIT,
    nameMaxLength: 50,
    extraField: { key: 'abbreviation', column: 'abbreviation', maxLength: 20 },
    usedBy: 'items',
  },
  locations: {
    label: 'Location',
    entityType: ENTITY_TYPES.LOCATION,
    nameMaxLength: 100,
    extraField: { key: 'description', column: 'description', maxLength: 255 },
    usedBy: 'items',
  },
  positions: {
    label: 'Position',
    entityType: ENTITY_TYPES.POSITION,
    nameMaxLength: 100,
    extraField: null,
    usedBy: 'user accounts',
  },
});

/**
 * Returns the rules for a resource or throws 404 for an unknown one.
 * @param {string} resource - Resource key from the URL.
 * @returns {typeof RESOURCE_RULES.categories} Rules.
 * @throws {import('../utils/errors.js').AppError} 404 for an unknown resource.
 */
const getRules = (resource) => {
  if (!Object.hasOwn(RESOURCE_RULES, resource)) {
    throw createAppError('Unknown master data list', 404);
  }

  return RESOURCE_RULES[resource];
};

/**
 * Lists every record of a master data list (active and inactive).
 * @param {string} resource - Resource key.
 * @returns {Promise<MasterDataRecord[]>} Records.
 * @throws {import('../utils/errors.js').AppError} 404 for an unknown list.
 */
export const listRecords = async (resource) => {
  getRules(resource);

  return masterDataRepository.list(resource);
};

/**
 * Validates a create/update payload and returns snake_case column values.
 * @param {MasterDataResource} resource - Resource key.
 * @param {{ name?: string, description?: string, abbreviation?: string }} payload - Request body.
 * @param {number | null} excludeId - Record being edited (for the duplicate name check).
 * @returns {Promise<Object>} Column values.
 * @throws {import('../utils/errors.js').AppError} 400 with field errors.
 */
const validatePayload = async (resource, payload, excludeId) => {
  const rules = getRules(resource);
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const errors = {};

  if (!isRequired(name)) {
    errors.name = 'Name is required';
  } else if (!isMaxLength(name, rules.nameMaxLength)) {
    errors.name = `Use at most ${rules.nameMaxLength} characters`;
  } else if (await masterDataRepository.nameExists(resource, name, excludeId)) {
    errors.name = `${rules.label} "${name}" already exists`;
  }

  const values = { name };

  if (rules.extraField) {
    const raw = payload[rules.extraField.key];
    const extraValue = typeof raw === 'string' ? raw.trim() : '';

    if (!isMaxLength(extraValue, rules.extraField.maxLength)) {
      errors[rules.extraField.key] = `Use at most ${rules.extraField.maxLength} characters`;
    }

    values[rules.extraField.column] = extraValue || null;
  }

  if (payload.isActive !== undefined && typeof payload.isActive !== 'boolean') {
    errors.isActive = 'Active must be true or false';
  }

  throwIfInvalid(errors);

  return values;
};

/**
 * Writes an audit log entry for a master data change.
 * @param {MasterDataResource} resource - Resource key.
 * @param {{ action: string, entityId: number, before?: Object | null, after?: Object | null }} entry - What changed.
 * @param {Actor} actor - User making the change.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<void>}
 */
const writeAudit = async (resource, entry, actor, trx) => {
  await auditLogsRepository.create(
    {
      userId: actor.id,
      action: entry.action,
      entityType: RESOURCE_RULES[resource].entityType,
      entityId: entry.entityId,
      before: entry.before || null,
      after: entry.after || null,
      ipAddress: actor.ipAddress,
    },
    trx,
  );
};

/**
 * Loads a record with a row lock, or throws 404.
 * @param {MasterDataResource} resource - Resource key.
 * @param {number} id - Record ID.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<MasterDataRecord>} Record.
 * @throws {import('../utils/errors.js').AppError} 404 when not found.
 */
const getRecordForUpdate = async (resource, id, trx) => {
  const record = await masterDataRepository.findByIdForUpdate(resource, id, trx);

  if (!record) {
    throw createAppError(`${RESOURCE_RULES[resource].label} not found`, 404);
  }

  return record;
};

/**
 * Creates a master data record.
 * @param {string} resource - Resource key.
 * @param {{ name?: string, description?: string, abbreviation?: string }} payload - Request body.
 * @param {Actor} actor - Admin creating the record.
 * @returns {Promise<MasterDataRecord>} Created record.
 * @throws {import('../utils/errors.js').AppError} 400 with field errors, 404 unknown list.
 */
export const createRecord = async (resource, payload, actor) => {
  const values = await validatePayload(resource, payload, null);

  return db.transaction(async (trx) => {
    const id = await masterDataRepository.create(
      resource,
      { ...values, created_by: actor.id, updated_by: actor.id },
      trx,
    );

    const after = await masterDataRepository.findById(resource, id, trx);

    await writeAudit(resource, { action: AUDIT_ACTIONS.CREATE, entityId: id, after }, actor, trx);

    return after;
  });
};

/**
 * Updates a record's name, extra field and active flag.
 * @param {string} resource - Resource key.
 * @param {number} id - Record ID.
 * @param {{ name?: string, description?: string, abbreviation?: string, isActive?: boolean }} payload - Request body.
 * @param {Actor} actor - Admin making the change.
 * @returns {Promise<MasterDataRecord>} Updated record.
 * @throws {import('../utils/errors.js').AppError} 400 with field errors, 404 not found.
 */
export const updateRecord = async (resource, id, payload, actor) => {
  const values = await validatePayload(resource, payload, id);

  return db.transaction(async (trx) => {
    const before = await getRecordForUpdate(resource, id, trx);

    await masterDataRepository.update(
      resource,
      id,
      {
        ...values,
        is_active: payload.isActive === undefined ? before.isActive : payload.isActive,
        updated_by: actor.id,
      },
      trx,
    );

    const after = await masterDataRepository.findById(resource, id, trx);

    await writeAudit(
      resource,
      { action: AUDIT_ACTIONS.UPDATE, entityId: id, before, after },
      actor,
      trx,
    );

    return after;
  });
};

/**
 * Soft-deletes a record that nothing uses. Records in use can only be deactivated.
 * @param {string} resource - Resource key.
 * @param {number} id - Record ID.
 * @param {Actor} actor - Admin making the change.
 * @returns {Promise<void>}
 * @throws {import('../utils/errors.js').AppError} 404 not found, 409 still in use.
 */
export const deleteRecord = async (resource, id, actor) => {
  const rules = getRules(resource);

  await db.transaction(async (trx) => {
    const before = await getRecordForUpdate(resource, id, trx);

    if (before.usageCount > 0) {
      throw createAppError(
        `${rules.label} is in use (${before.usageCount} ${rules.usedBy}). Deactivate it instead.`,
        409,
      );
    }

    await masterDataRepository.softDelete(resource, id, trx);
    await writeAudit(resource, { action: AUDIT_ACTIONS.DELETE, entityId: id, before }, actor, trx);
  });
};
