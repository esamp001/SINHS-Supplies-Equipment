import { db } from '../config/db.js';
import * as auditLogsRepository from '../repositories/auditLogs.repository.js';
import * as itemTypesRepository from '../repositories/itemTypes.repository.js';
import { createAppError, throwIfInvalid } from '../utils/errors.js';
import {
  AUDIT_ACTIONS,
  ENTITY_TYPES,
  FIELD_APPLIES_TO,
  FIELD_DATA_TYPES,
  ITEM_KINDS,
  TRACKING_MODES,
} from '../utils/constants.js';
import {
  isMaxLength,
  isOneOf,
  isPositiveInt,
  isRequired,
  isValidDate,
} from '../utils/validators.js';

/**
 * @typedef {import('../repositories/itemTypes.repository.js').ItemType} ItemType
 * @typedef {import('../repositories/itemTypes.repository.js').ItemTypeField} ItemTypeField
 * @typedef {import('../utils/requestParsers.js').Actor} Actor
 */

/** Field keys: lowercase letter first, then lowercase letters, digits or underscores. */
const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]{0,59}$/;

/** Longest borrow limit allowed on an item type. */
const MAX_BORROW_DAYS_LIMIT = 365;

/** Longest text value stored in a custom text field. */
const MAX_TEXT_VALUE_LENGTH = 255;

/**
 * Writes an audit log entry for an item type or field change.
 * @param {{ action: string, entityType: string, entityId: number, before?: Object | null, after?: Object | null }} entry - What changed.
 * @param {Actor} actor - User making the change.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<void>}
 */
const writeAudit = async (entry, actor, trx) => {
  await auditLogsRepository.create(
    {
      userId: actor.id,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before || null,
      after: entry.after || null,
      ipAddress: actor.ipAddress,
    },
    trx,
  );
};

/**
 * Lists item types with their fields.
 * @param {{ activeOnly?: string }} query - Query parameters (`activeOnly=true` for dropdowns).
 * @returns {Promise<ItemType[]>} Item types.
 */
export const listItemTypes = async (query) =>
  itemTypesRepository.list({ activeOnly: query.activeOnly === 'true' });

/**
 * Returns one item type with its fields.
 * @param {number} id - Item type ID.
 * @returns {Promise<ItemType>} Item type.
 * @throws {import('../utils/errors.js').AppError} 404 when not found.
 */
export const getItemType = async (id) => {
  const itemType = await itemTypesRepository.findById(id);

  if (!itemType) {
    throw createAppError('Item type not found', 404);
  }

  return itemType;
};

/**
 * Loads an item type with a row lock, or throws 404.
 * @param {number} id - Item type ID.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<ItemType>} Item type.
 * @throws {import('../utils/errors.js').AppError} 404 when not found.
 */
const getItemTypeForUpdate = async (id, trx) => {
  const itemType = await itemTypesRepository.findByIdForUpdate(id, trx);

  if (!itemType) {
    throw createAppError('Item type not found', 404);
  }

  return itemType;
};

/**
 * Validates an item type payload and returns snake_case column values.
 * @param {{ name?: string, kind?: string, trackingMode?: string, maxBorrowDays?: number | null, isActive?: boolean }} payload - Request body.
 * @param {number | null} excludeId - Type being edited (for the duplicate name check).
 * @returns {Promise<Object>} Column values.
 * @throws {import('../utils/errors.js').AppError} 400 with field errors.
 */
const validateItemTypePayload = async (payload, excludeId) => {
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const { kind, trackingMode } = payload;
  const hasBorrowLimit = payload.maxBorrowDays !== null && payload.maxBorrowDays !== undefined;
  const errors = {};

  if (!isRequired(name)) {
    errors.name = 'Name is required';
  } else if (!isMaxLength(name, 100)) {
    errors.name = 'Use at most 100 characters';
  } else if (await itemTypesRepository.nameExists(name, excludeId)) {
    errors.name = `Item type "${name}" already exists`;
  }

  if (!isOneOf(kind, Object.values(ITEM_KINDS))) {
    errors.kind = 'Choose supply or equipment';
  }

  if (!isOneOf(trackingMode, Object.values(TRACKING_MODES))) {
    errors.trackingMode = 'Choose how stock is tracked';
  } else if (kind === ITEM_KINDS.SUPPLY && trackingMode === TRACKING_MODES.UNIT) {
    errors.trackingMode = 'Supplies are tracked by quantity only';
  }

  if (hasBorrowLimit && kind === ITEM_KINDS.SUPPLY) {
    errors.maxBorrowDays = 'Only equipment can have a borrow limit';
  } else if (
    hasBorrowLimit &&
    (!isPositiveInt(payload.maxBorrowDays) || payload.maxBorrowDays > MAX_BORROW_DAYS_LIMIT)
  ) {
    errors.maxBorrowDays = `Enter 1–${MAX_BORROW_DAYS_LIMIT} days, or leave empty for no limit`;
  }

  if (payload.isActive !== undefined && typeof payload.isActive !== 'boolean') {
    errors.isActive = 'Active must be true or false';
  }

  throwIfInvalid(errors);

  return {
    name,
    kind,
    tracking_mode: trackingMode,
    max_borrow_days: hasBorrowLimit ? Number(payload.maxBorrowDays) : null,
  };
};

/**
 * Creates an item type (fields are added separately).
 * @param {{ name?: string, kind?: string, trackingMode?: string, maxBorrowDays?: number | null }} payload - Request body.
 * @param {Actor} actor - Admin or custodian.
 * @returns {Promise<ItemType>} Created item type.
 * @throws {import('../utils/errors.js').AppError} 400 with field errors.
 */
export const createItemType = async (payload, actor) => {
  const values = await validateItemTypePayload(payload, null);

  return db.transaction(async (trx) => {
    const id = await itemTypesRepository.create(
      { ...values, created_by: actor.id, updated_by: actor.id },
      trx,
    );

    const after = await itemTypesRepository.findById(id, trx);

    await writeAudit(
      { action: AUDIT_ACTIONS.CREATE, entityType: ENTITY_TYPES.ITEM_TYPE, entityId: id, after },
      actor,
      trx,
    );

    return after;
  });
};

/**
 * Updates an item type. Kind and tracking mode can only change while no items use the type.
 * @param {number} id - Item type ID.
 * @param {{ name?: string, kind?: string, trackingMode?: string, maxBorrowDays?: number | null, isActive?: boolean }} payload - Request body.
 * @param {Actor} actor - Admin or custodian.
 * @returns {Promise<ItemType>} Updated item type.
 * @throws {import('../utils/errors.js').AppError} 400 invalid, 404 not found, 409 kind/tracking change while in use.
 */
export const updateItemType = async (id, payload, actor) => {
  const values = await validateItemTypePayload(payload, id);

  return db.transaction(async (trx) => {
    const before = await getItemTypeForUpdate(id, trx);

    const isStructureChanged =
      values.kind !== before.kind || values.tracking_mode !== before.trackingMode;

    if (isStructureChanged && before.itemCount > 0) {
      throw createAppError('Kind and tracking mode cannot change while items use this type', 409, {
        kind: 'In use by existing items',
      });
    }

    const hasUnitFields = before.fields.some((field) => field.appliesTo === FIELD_APPLIES_TO.UNIT);

    if (values.tracking_mode === TRACKING_MODES.QUANTITY && hasUnitFields) {
      throw createAppError('Remove the per-unit fields before tracking by quantity', 409, {
        trackingMode: 'This type has per-unit fields',
      });
    }

    await itemTypesRepository.update(
      id,
      {
        ...values,
        is_active: payload.isActive === undefined ? before.isActive : payload.isActive,
        updated_by: actor.id,
      },
      trx,
    );

    const after = await itemTypesRepository.findById(id, trx);

    await writeAudit(
      {
        action: AUDIT_ACTIONS.UPDATE,
        entityType: ENTITY_TYPES.ITEM_TYPE,
        entityId: id,
        before,
        after,
      },
      actor,
      trx,
    );

    return after;
  });
};

/**
 * Deletes an item type that no item has ever used. Types in use can only be deactivated.
 * @param {number} id - Item type ID.
 * @param {Actor} actor - Admin or custodian.
 * @returns {Promise<void>}
 * @throws {import('../utils/errors.js').AppError} 404 not found, 409 in use.
 */
export const deleteItemType = async (id, actor) => {
  await db.transaction(async (trx) => {
    const before = await getItemTypeForUpdate(id, trx);

    if (before.itemCount > 0) {
      throw createAppError('This type is used by items. Deactivate it instead.', 409);
    }

    await itemTypesRepository.remove(id, trx);

    await writeAudit(
      { action: AUDIT_ACTIONS.DELETE, entityType: ENTITY_TYPES.ITEM_TYPE, entityId: id, before },
      actor,
      trx,
    );
  });
};

/**
 * Validates `select` options: a non-empty list of unique, non-empty strings.
 * @param {*} options - Options from the request.
 * @returns {string | null} Error message, or null when valid.
 */
const getOptionsError = (options) => {
  if (!Array.isArray(options) || !options.length) {
    return 'Add at least one option';
  }

  const trimmed = options.map((option) => (typeof option === 'string' ? option.trim() : ''));

  if (trimmed.some((option) => !option || option.length > 100)) {
    return 'Options must be 1–100 characters';
  }

  if (new Set(trimmed.map((option) => option.toLowerCase())).size !== trimmed.length) {
    return 'Options must be unique';
  }

  return null;
};

/**
 * Validates the editable parts of a field (label, options, required, sort order, active).
 * @param {Object} payload - Request body.
 * @param {string} dataType - The field's data type.
 * @param {Object<string, string>} errors - Collected field errors (mutated).
 * @returns {Object} Snake_case column values.
 */
const validateFieldDetails = (payload, dataType, errors) => {
  const label = typeof payload.label === 'string' ? payload.label.trim() : '';

  if (!isRequired(label)) {
    errors.label = 'Label is required';
  } else if (!isMaxLength(label, 100)) {
    errors.label = 'Use at most 100 characters';
  }

  const values = {
    label,
    is_required: Boolean(payload.isRequired),
    options: null,
  };

  if (dataType === FIELD_DATA_TYPES.SELECT) {
    const optionsError = getOptionsError(payload.options);

    if (optionsError) {
      errors.options = optionsError;
    } else {
      values.options = JSON.stringify(payload.options.map((option) => option.trim()));
    }
  }

  if (payload.sortOrder !== undefined && !Number.isInteger(payload.sortOrder)) {
    errors.sortOrder = 'Sort order must be a whole number';
  } else if (payload.sortOrder !== undefined) {
    values.sort_order = payload.sortOrder;
  }

  if (payload.isActive !== undefined && typeof payload.isActive !== 'boolean') {
    errors.isActive = 'Active must be true or false';
  } else if (payload.isActive !== undefined) {
    values.is_active = payload.isActive;
  }

  return values;
};

/**
 * Adds a custom field to an item type.
 * @param {number} itemTypeId - Item type ID.
 * @param {{ key?: string, label?: string, dataType?: string, options?: string[], isRequired?: boolean, appliesTo?: string, sortOrder?: number }} payload - Request body.
 * @param {Actor} actor - Admin or custodian.
 * @returns {Promise<ItemType>} The item type with its updated fields.
 * @throws {import('../utils/errors.js').AppError} 400 invalid, 404 type not found.
 */
export const createField = async (itemTypeId, payload, actor) =>
  db.transaction(async (trx) => {
    const itemType = await getItemTypeForUpdate(itemTypeId, trx);
    const key = typeof payload.key === 'string' ? payload.key.trim() : '';
    const appliesTo = payload.appliesTo || FIELD_APPLIES_TO.ITEM;
    const errors = {};

    if (!FIELD_KEY_PATTERN.test(key)) {
      errors.key = 'Use lowercase letters, numbers and underscores, starting with a letter';
    } else if (await itemTypesRepository.fieldKeyExists(itemTypeId, key, trx)) {
      errors.key = 'This key is already used on this type';
    }

    if (!isOneOf(payload.dataType, Object.values(FIELD_DATA_TYPES))) {
      errors.dataType = 'Choose a data type';
    }

    if (!isOneOf(appliesTo, Object.values(FIELD_APPLIES_TO))) {
      errors.appliesTo = 'Choose item or unit';
    } else if (
      appliesTo === FIELD_APPLIES_TO.UNIT &&
      itemType.trackingMode !== TRACKING_MODES.UNIT
    ) {
      errors.appliesTo = 'Per-unit fields need a type tracked by unit';
    }

    const details = validateFieldDetails(payload, payload.dataType, errors);

    throwIfInvalid(errors);

    const sortOrder =
      details.sort_order ?? (await itemTypesRepository.maxFieldSortOrder(itemTypeId, trx)) + 1;

    const fieldId = await itemTypesRepository.createField(
      {
        ...details,
        item_type_id: itemTypeId,
        key,
        data_type: payload.dataType,
        applies_to: appliesTo,
        sort_order: sortOrder,
      },
      trx,
    );

    const after = await itemTypesRepository.findById(itemTypeId, trx);

    await writeAudit(
      {
        action: AUDIT_ACTIONS.CREATE,
        entityType: ENTITY_TYPES.ITEM_TYPE_FIELD,
        entityId: fieldId,
        after: after.fields.find((field) => field.id === fieldId),
      },
      actor,
      trx,
    );

    return after;
  });

/**
 * Loads a field with a row lock, or throws 404.
 * @param {number} itemTypeId - Item type ID.
 * @param {number} fieldId - Field ID.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<ItemTypeField>} Field.
 * @throws {import('../utils/errors.js').AppError} 404 when not found.
 */
const getFieldForUpdate = async (itemTypeId, fieldId, trx) => {
  const field = await itemTypesRepository.findFieldForUpdate(itemTypeId, fieldId, trx);

  if (!field) {
    throw createAppError('Field not found', 404);
  }

  return field;
};

/**
 * Updates a field. The key and "applies to" never change; the data type can change only while
 * no record has a value, and select options in use cannot be removed (AGENTS.md §9).
 * @param {number} itemTypeId - Item type ID.
 * @param {number} fieldId - Field ID.
 * @param {{ label?: string, dataType?: string, options?: string[], isRequired?: boolean, sortOrder?: number, isActive?: boolean }} payload - Request body.
 * @param {Actor} actor - Admin or custodian.
 * @returns {Promise<ItemType>} The item type with its updated fields.
 * @throws {import('../utils/errors.js').AppError} 400 invalid, 404 not found, 409 change would break existing values.
 */
export const updateField = async (itemTypeId, fieldId, payload, actor) =>
  db.transaction(async (trx) => {
    const before = await getFieldForUpdate(itemTypeId, fieldId, trx);
    const dataType = payload.dataType || before.dataType;
    const errors = {};

    if (!isOneOf(dataType, Object.values(FIELD_DATA_TYPES))) {
      errors.dataType = 'Choose a data type';
    }

    const details = validateFieldDetails(payload, dataType, errors);

    throwIfInvalid(errors);

    const valueCount = await itemTypesRepository.countFieldValues(before, trx);

    if (dataType !== before.dataType && valueCount > 0) {
      throw createAppError('The data type cannot change once records have values', 409, {
        dataType: `${valueCount} record(s) already have a value`,
      });
    }

    if (dataType === FIELD_DATA_TYPES.SELECT && before.dataType === FIELD_DATA_TYPES.SELECT) {
      const newOptions = JSON.parse(details.options);

      const removedOptions = (before.options || []).filter(
        (option) => !newOptions.includes(option),
      );

      const usedCount = await itemTypesRepository.countFieldValuesIn(before, removedOptions, trx);

      if (usedCount > 0) {
        throw createAppError('A removed option is still used by existing records', 409, {
          options: `${usedCount} record(s) use a removed option`,
        });
      }
    }

    await itemTypesRepository.updateField(fieldId, { ...details, data_type: dataType }, trx);
    const after = await itemTypesRepository.findById(itemTypeId, trx);

    await writeAudit(
      {
        action: AUDIT_ACTIONS.UPDATE,
        entityType: ENTITY_TYPES.ITEM_TYPE_FIELD,
        entityId: fieldId,
        before,
        after: after.fields.find((field) => field.id === fieldId),
      },
      actor,
      trx,
    );

    return after;
  });

/**
 * Deletes a field that no record has a value for. Fields with data can only be deactivated.
 * @param {number} itemTypeId - Item type ID.
 * @param {number} fieldId - Field ID.
 * @param {Actor} actor - Admin or custodian.
 * @returns {Promise<ItemType>} The item type with its remaining fields.
 * @throws {import('../utils/errors.js').AppError} 404 not found, 409 has values.
 */
export const deleteField = async (itemTypeId, fieldId, actor) =>
  db.transaction(async (trx) => {
    const before = await getFieldForUpdate(itemTypeId, fieldId, trx);
    const valueCount = await itemTypesRepository.countFieldValues(before, trx);

    if (valueCount > 0) {
      throw createAppError(
        `${valueCount} record(s) have a value for this field. Deactivate it instead.`,
        409,
      );
    }

    await itemTypesRepository.removeField(fieldId, trx);

    await writeAudit(
      {
        action: AUDIT_ACTIONS.DELETE,
        entityType: ENTITY_TYPES.ITEM_TYPE_FIELD,
        entityId: fieldId,
        before,
      },
      actor,
      trx,
    );

    return itemTypesRepository.findById(itemTypeId, trx);
  });

/**
 * Converts one attribute value to its stored form, or returns an error message.
 * @param {ItemTypeField} field - Field definition.
 * @param {*} value - Submitted value (not empty).
 * @returns {{ value?: *, error?: string }} Stored value or error.
 */
const coerceAttributeValue = (field, value) => {
  if (field.dataType === FIELD_DATA_TYPES.NUMBER) {
    const number = Number(value);

    return Number.isFinite(number)
      ? { value: number }
      : { error: `${field.label} must be a number` };
  }

  if (field.dataType === FIELD_DATA_TYPES.BOOLEAN) {
    return typeof value === 'boolean' ? { value } : { error: `${field.label} must be yes or no` };
  }

  if (field.dataType === FIELD_DATA_TYPES.DATE) {
    return isValidDate(value) ? { value } : { error: `${field.label} must be a valid date` };
  }

  if (field.dataType === FIELD_DATA_TYPES.SELECT) {
    return (field.options || []).includes(value)
      ? { value }
      : { error: `Choose one of the ${field.label} options` };
  }

  if (typeof value !== 'string' || !isMaxLength(value.trim(), MAX_TEXT_VALUE_LENGTH)) {
    return { error: `${field.label} must be text of at most ${MAX_TEXT_VALUE_LENGTH} characters` };
  }

  return { value: value.trim() };
};

/**
 * Validates custom attribute values against an item type's field definitions (AGENTS.md §9):
 * required fields present, values match the data type, select values are allowed options and
 * unknown keys are rejected. Values of inactive fields are kept from `existing` unchanged.
 * @param {ItemTypeField[]} fields - The item type's fields.
 * @param {*} attributes - Submitted attributes object.
 * @param {'item' | 'unit'} appliesTo - Which fields apply (item-level or unit-level).
 * @param {Object<string, *>} [existing={}] - Currently stored attributes (when editing).
 * @returns {{ values: Object<string, *>, errors: Object<string, string> }} Clean values and errors keyed `attributes.<key>`.
 */
export const validateAttributes = (fields, attributes, appliesTo, existing = {}) => {
  const submitted =
    attributes && typeof attributes === 'object' && !Array.isArray(attributes) ? attributes : {};

  const relevantFields = fields.filter((field) => field.appliesTo === appliesTo);
  const values = {};
  const errors = {};

  Object.keys(submitted).forEach((key) => {
    const field = relevantFields.find((candidate) => candidate.key === key);

    if (!field || !field.isActive) {
      errors[`attributes.${key}`] = `Unknown field "${key}"`;
    }
  });

  relevantFields.forEach((field) => {
    if (!field.isActive) {
      if (Object.hasOwn(existing, field.key)) {
        values[field.key] = existing[field.key];
      }

      return;
    }

    const value = submitted[field.key];
    const isEmpty = value === undefined || value === null || value === '';

    if (isEmpty) {
      if (field.isRequired) {
        errors[`attributes.${field.key}`] = `${field.label} is required`;
      }

      return;
    }

    const result = coerceAttributeValue(field, value);

    if (result.error) {
      errors[`attributes.${field.key}`] = result.error;
    } else {
      values[field.key] = result.value;
    }
  });

  return { values, errors };
};
