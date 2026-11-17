import { db } from '../config/db.js';
import * as auditLogsRepository from '../repositories/auditLogs.repository.js';
import * as itemTypesRepository from '../repositories/itemTypes.repository.js';
import * as itemsRepository from '../repositories/items.repository.js';
import * as masterDataRepository from '../repositories/masterData.repository.js';
import * as stockTransactionsRepository from '../repositories/stockTransactions.repository.js';
import { createAppError, throwIfInvalid } from '../utils/errors.js';
import {
  AUDIT_ACTIONS,
  ENTITY_TYPES,
  FIELD_APPLIES_TO,
  ITEM_KINDS,
  REFERENCE_TYPES,
  TRACKING_MODES,
  TRANSACTION_TYPES,
  UNIT_STATUS,
} from '../utils/constants.js';
import { buildMeta, parsePagination, parseSort } from '../utils/pagination.js';
import {
  isMaxLength,
  isNonNegativeInt,
  isOneOf,
  isPositiveInt,
  isRequired,
} from '../utils/validators.js';
import { validateAttributes } from './itemTypes.service.js';

/**
 * @typedef {import('../repositories/items.repository.js').ItemRecord} ItemRecord
 * @typedef {import('../repositories/items.repository.js').ItemUnitRecord} ItemUnitRecord
 * @typedef {import('../utils/requestParsers.js').Actor} Actor
 */

/** Sortable columns for the items list (API key → database column). */
const ITEM_SORT_COLUMNS = Object.freeze({
  code: 'items.code',
  name: 'items.name',
  itemTypeName: 'item_types.name',
  categoryName: 'categories.name',
  quantityOnHand: 'items.quantity_on_hand',
  updatedAt: 'items.updated_at',
});

/** Item codes: letters, digits, dots, dashes and slashes. */
const ITEM_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9./-]{0,49}$/;

/** Statuses a custodian can set on a unit by hand (borrowed is set by the borrow flow). */
const MANUAL_UNIT_STATUSES = [
  UNIT_STATUS.AVAILABLE,
  UNIT_STATUS.UNDER_REPAIR,
  UNIT_STATUS.LOST,
  UNIT_STATUS.DISPOSED,
];

/**
 * Writes an audit log entry for an item or unit change.
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
 * Converts an optional numeric query parameter to a number (or undefined).
 * @param {*} value - Query value.
 * @returns {number | undefined} Number, or undefined when empty or invalid.
 */
const toOptionalId = (value) => (isPositiveInt(value) ? Number(value) : undefined);

/**
 * Lists items with filters, sorting and pagination (AGENTS.md §5).
 * @param {{ page?: string, pageSize?: string, search?: string, sortBy?: string, sortOrder?: string, itemTypeId?: string, categoryId?: string, locationId?: string, kind?: string, trackingMode?: string, lowStockOnly?: string, availableOnly?: string }} query - Query parameters.
 * @returns {Promise<{ rows: ItemRecord[], meta: { page: number, pageSize: number, total: number } }>} Page of items.
 */
export const listItems = async (query) => {
  const pagination = parsePagination(query);
  const sort = parseSort(query, ITEM_SORT_COLUMNS, 'name');

  const filters = {
    search: (query.search || '').trim(),
    itemTypeId: toOptionalId(query.itemTypeId),
    categoryId: toOptionalId(query.categoryId),
    locationId: toOptionalId(query.locationId),
    kind: isOneOf(query.kind, Object.values(ITEM_KINDS)) ? query.kind : undefined,
    trackingMode: isOneOf(query.trackingMode, Object.values(TRACKING_MODES))
      ? query.trackingMode
      : undefined,
    lowStockOnly: query.lowStockOnly === 'true',
    availableOnly: query.availableOnly === 'true',
  };

  const { rows, total } = await itemsRepository.list(filters, sort, pagination);

  return { rows, meta: buildMeta(pagination, total) };
};

/**
 * Returns an item with its type's fields and, for unit-tracked items, its units.
 * @param {number} id - Item ID.
 * @returns {Promise<ItemRecord & { fields: Array<Object>, units: ItemUnitRecord[] }>} Item detail.
 * @throws {import('../utils/errors.js').AppError} 404 when not found.
 */
export const getItem = async (id) => {
  const item = await itemsRepository.findById(id);

  if (!item) {
    throw createAppError('Item not found', 404);
  }

  const [fields, units] = await Promise.all([
    itemTypesRepository.listFieldsByTypeIds([item.itemTypeId]),
    item.trackingMode === TRACKING_MODES.UNIT ? itemsRepository.listUnits(id) : [],
  ]);

  return { ...item, fields, units };
};

/**
 * Loads an item with a row lock, or throws 404.
 * @param {number} id - Item ID.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<ItemRecord>} Item.
 * @throws {import('../utils/errors.js').AppError} 404 when not found.
 */
const getItemForUpdate = async (id, trx) => {
  const item = await itemsRepository.findByIdForUpdate(id, trx);

  if (!item) {
    throw createAppError('Item not found', 404);
  }

  return item;
};

/**
 * Checks that an optional master data reference exists and is active. A record that is already
 * assigned (when editing) is accepted even if it was deactivated later.
 * @param {'categories' | 'units' | 'locations'} resource - List name.
 * @param {*} id - Submitted ID (may be empty).
 * @param {number | null} currentId - Currently assigned ID.
 * @returns {Promise<boolean>} True when acceptable.
 */
const isValidReference = async (resource, id, currentId) => {
  if (!isPositiveInt(id)) {
    return false;
  }

  if (Number(id) === currentId) {
    return true;
  }

  const record = await masterDataRepository.findById(resource, Number(id));

  return Boolean(record && record.isActive);
};

/**
 * Validates an item payload and returns snake_case column values plus extra data.
 * @param {Object} payload - Request body.
 * @param {ItemRecord | null} existing - Item being edited, or null when creating.
 * @returns {Promise<{ values: Object, itemType: import('../repositories/itemTypes.repository.js').ItemType, openingQuantity: number }>} Validated data.
 * @throws {import('../utils/errors.js').AppError} 400 with field errors.
 */
const validateItemPayload = async (payload, existing) => {
  const code = typeof payload.code === 'string' ? payload.code.trim() : '';
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const errors = {};

  if (!isRequired(code)) {
    errors.code = 'Code is required';
  } else if (!ITEM_CODE_PATTERN.test(code)) {
    errors.code = 'Use up to 50 letters, numbers, dots, dashes or slashes';
  } else if (await itemsRepository.codeExists(code, existing?.id || null)) {
    errors.code = `Code "${code}" is already used`;
  }

  if (!isRequired(name)) {
    errors.name = 'Name is required';
  } else if (!isMaxLength(name, 150)) {
    errors.name = 'Use at most 150 characters';
  }

  const itemType = isPositiveInt(payload.itemTypeId)
    ? await itemTypesRepository.findById(Number(payload.itemTypeId))
    : null;

  const isSameType = existing && itemType && existing.itemTypeId === itemType.id;

  if (!itemType) {
    errors.itemTypeId = 'Choose an item type';
  } else if (!itemType.isActive && !isSameType) {
    errors.itemTypeId = 'This item type is inactive';
  }

  if (!(await isValidReference('units', payload.unitId, existing?.unitId ?? null))) {
    errors.unitId = 'Choose a unit of measure';
  }

  const hasCategory = payload.categoryId !== null && payload.categoryId !== undefined;
  const hasLocation = payload.locationId !== null && payload.locationId !== undefined;

  if (
    hasCategory &&
    !(await isValidReference('categories', payload.categoryId, existing?.categoryId ?? null))
  ) {
    errors.categoryId = 'Choose an active category';
  }

  if (
    hasLocation &&
    !(await isValidReference('locations', payload.locationId, existing?.locationId ?? null))
  ) {
    errors.locationId = 'Choose an active location';
  }

  if (!isNonNegativeInt(payload.reorderLevel)) {
    errors.reorderLevel = 'Enter 0 or a positive whole number';
  }

  const hasOpeningQuantity =
    !existing && payload.openingQuantity !== undefined && payload.openingQuantity !== null;

  if (hasOpeningQuantity && !isNonNegativeInt(payload.openingQuantity)) {
    errors.openingQuantity = 'Enter 0 or a positive whole number';
  } else if (
    hasOpeningQuantity &&
    Number(payload.openingQuantity) > 0 &&
    itemType?.trackingMode === TRACKING_MODES.UNIT
  ) {
    errors.openingQuantity = 'Register individual units instead';
  }

  let attributes = {};

  if (itemType) {
    const result = validateAttributes(
      itemType.fields,
      payload.attributes,
      FIELD_APPLIES_TO.ITEM,
      isSameType ? existing.attributes : {},
    );

    Object.assign(errors, result.errors);
    attributes = result.values;
  }

  throwIfInvalid(errors);

  return {
    itemType,
    openingQuantity: hasOpeningQuantity ? Number(payload.openingQuantity) : 0,
    values: {
      code,
      name,
      item_type_id: itemType.id,
      unit_id: Number(payload.unitId),
      category_id: hasCategory ? Number(payload.categoryId) : null,
      location_id: hasLocation ? Number(payload.locationId) : null,
      reorder_level: Number(payload.reorderLevel),
      attributes: JSON.stringify(attributes),
    },
  };
};

/**
 * Creates an item. An opening quantity (quantity-tracked items only) is written to the ledger
 * as a stock-in so quantity on hand always equals the ledger (AGENTS.md §9).
 * @param {Object} payload - Request body (code, name, itemTypeId, unitId, categoryId, locationId, reorderLevel, attributes, openingQuantity).
 * @param {Actor} actor - Admin or custodian.
 * @returns {Promise<ItemRecord>} Created item.
 * @throws {import('../utils/errors.js').AppError} 400 with field errors.
 */
export const createItem = async (payload, actor) => {
  const { values, openingQuantity } = await validateItemPayload(payload, null);

  return db.transaction(async (trx) => {
    const id = await itemsRepository.create(
      { ...values, quantity_on_hand: openingQuantity, created_by: actor.id, updated_by: actor.id },
      trx,
    );

    if (openingQuantity > 0) {
      await stockTransactionsRepository.create(
        {
          itemId: id,
          type: TRANSACTION_TYPES.STOCK_IN,
          quantity: openingQuantity,
          remarks: 'Opening balance',
          performedBy: actor.id,
        },
        trx,
      );
    }

    const after = await itemsRepository.findById(id, trx);

    await writeAudit(
      { action: AUDIT_ACTIONS.CREATE, entityType: ENTITY_TYPES.ITEM, entityId: id, after },
      actor,
      trx,
    );

    return after;
  });
};

/**
 * Updates an item's details. Quantity never changes here (use stock-in or adjustments), and the
 * item type can only change while the item has no stock history.
 * @param {number} id - Item ID.
 * @param {Object} payload - Request body.
 * @param {Actor} actor - Admin or custodian.
 * @returns {Promise<ItemRecord>} Updated item.
 * @throws {import('../utils/errors.js').AppError} 400 invalid, 404 not found, 409 type change with history.
 */
export const updateItem = async (id, payload, actor) => {
  const existing = await itemsRepository.findById(id);

  if (!existing) {
    throw createAppError('Item not found', 404);
  }

  const { values } = await validateItemPayload(payload, existing);

  return db.transaction(async (trx) => {
    const before = await getItemForUpdate(id, trx);

    const hasHistory = (await stockTransactionsRepository.countByItem(id, trx)) > 0;

    if (values.item_type_id !== before.itemTypeId && hasHistory) {
      throw createAppError('The item type cannot change once the item has stock history', 409, {
        itemTypeId: 'Item has stock history',
      });
    }

    await itemsRepository.update(id, { ...values, updated_by: actor.id }, trx);
    const after = await itemsRepository.findById(id, trx);

    await writeAudit(
      { action: AUDIT_ACTIONS.UPDATE, entityType: ENTITY_TYPES.ITEM, entityId: id, before, after },
      actor,
      trx,
    );

    return after;
  });
};

/**
 * Soft-deletes an item with no stock, no open requests and nothing borrowed. Its history stays.
 * @param {number} id - Item ID.
 * @param {Actor} actor - Admin or custodian.
 * @returns {Promise<void>}
 * @throws {import('../utils/errors.js').AppError} 404 not found, 409 still has stock or activity.
 */
export const deleteItem = async (id, actor) => {
  await db.transaction(async (trx) => {
    const before = await getItemForUpdate(id, trx);

    if (before.quantityOnHand > 0) {
      throw createAppError('Adjust the stock to zero before deleting this item', 409);
    }

    if ((await itemsRepository.countOpenRequests(id, trx)) > 0) {
      throw createAppError('This item is in pending or approved requests', 409);
    }

    if ((await itemsRepository.countUnreturnedBorrows(id, trx)) > 0) {
      throw createAppError('Some of this item is still borrowed', 409);
    }

    await itemsRepository.softDelete(id, actor.id, trx);

    await writeAudit(
      { action: AUDIT_ACTIONS.DELETE, entityType: ENTITY_TYPES.ITEM, entityId: id, before },
      actor,
      trx,
    );
  });
};

/**
 * Loads a unit-tracked item with a row lock, or throws.
 * @param {number} itemId - Item ID.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<ItemRecord>} Item.
 * @throws {import('../utils/errors.js').AppError} 404 not found, 409 not tracked by unit.
 */
const getUnitTrackedItemForUpdate = async (itemId, trx) => {
  const item = await getItemForUpdate(itemId, trx);

  if (item.trackingMode !== TRACKING_MODES.UNIT) {
    throw createAppError('This item is tracked by quantity, not by unit', 409);
  }

  return item;
};

/**
 * Loads one unit of an item with a row lock, or throws 404.
 * @param {number} itemId - Item ID.
 * @param {number} unitId - Unit ID.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<ItemUnitRecord>} Unit.
 * @throws {import('../utils/errors.js').AppError} 404 when not found.
 */
const getUnitForUpdate = async (itemId, unitId, trx) => {
  const [unit] = await itemsRepository.findUnitsForUpdate([unitId], trx);

  if (!unit || unit.itemId !== itemId) {
    throw createAppError('Unit not found', 404);
  }

  return unit;
};

/**
 * Validates unit details and returns snake_case column values.
 * @param {Object} payload - Request body (propertyNo, serialNo, condition, attributes).
 * @param {ItemRecord} item - Owning item.
 * @param {ItemUnitRecord | null} existing - Unit being edited, or null.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<Object>} Column values.
 * @throws {import('../utils/errors.js').AppError} 400 with field errors.
 */
const validateUnitPayload = async (payload, item, existing, trx) => {
  const propertyNo = typeof payload.propertyNo === 'string' ? payload.propertyNo.trim() : '';
  const serialNo = typeof payload.serialNo === 'string' ? payload.serialNo.trim() : '';
  const condition = typeof payload.condition === 'string' ? payload.condition.trim() : '';
  const errors = {};

  if (!isRequired(propertyNo)) {
    errors.propertyNo = 'Property number is required';
  } else if (!isMaxLength(propertyNo, 60)) {
    errors.propertyNo = 'Use at most 60 characters';
  } else if (await itemsRepository.propertyNoExists(propertyNo, existing?.id || null, trx)) {
    errors.propertyNo = `Property number "${propertyNo}" is already used`;
  }

  if (!isMaxLength(serialNo, 100)) {
    errors.serialNo = 'Use at most 100 characters';
  }

  if (!isMaxLength(condition, 30)) {
    errors.condition = 'Use at most 30 characters';
  }

  const fields = await itemTypesRepository.listFieldsByTypeIds([item.itemTypeId], trx);

  const result = validateAttributes(
    fields,
    payload.attributes,
    FIELD_APPLIES_TO.UNIT,
    existing?.attributes || {},
  );

  Object.assign(errors, result.errors);
  throwIfInvalid(errors);

  return {
    property_no: propertyNo,
    serial_no: serialNo || null,
    condition: condition || 'good',
    attributes: JSON.stringify(result.values),
  };
};

/**
 * Registers a new unit of a unit-tracked item. It starts as available, so quantity on hand goes
 * up by one with a matching stock-in ledger entry.
 * @param {number} itemId - Item ID.
 * @param {Object} payload - Request body (propertyNo, serialNo, condition, attributes).
 * @param {Actor} actor - Admin or custodian.
 * @returns {Promise<ItemUnitRecord[]>} The item's units.
 * @throws {import('../utils/errors.js').AppError} 400 invalid, 404 not found, 409 not unit-tracked.
 */
export const addUnit = async (itemId, payload, actor) =>
  db.transaction(async (trx) => {
    const item = await getUnitTrackedItemForUpdate(itemId, trx);
    const values = await validateUnitPayload(payload, item, null, trx);
    const unitId = await itemsRepository.createUnit({ ...values, item_id: itemId }, trx);

    await itemsRepository.adjustQuantity(itemId, 1, actor.id, trx);

    await stockTransactionsRepository.create(
      {
        itemId,
        itemUnitId: unitId,
        type: TRANSACTION_TYPES.STOCK_IN,
        quantity: 1,
        referenceType: REFERENCE_TYPES.ITEM_UNIT,
        referenceId: unitId,
        remarks: `New unit ${values.property_no}`,
        performedBy: actor.id,
      },
      trx,
    );

    const units = await itemsRepository.listUnits(itemId, trx);

    await writeAudit(
      {
        action: AUDIT_ACTIONS.CREATE,
        entityType: ENTITY_TYPES.ITEM_UNIT,
        entityId: unitId,
        after: units.find((unit) => unit.id === unitId),
      },
      actor,
      trx,
    );

    return units;
  });

/**
 * Updates a unit's property number, serial number, condition and custom values.
 * @param {number} itemId - Item ID.
 * @param {number} unitId - Unit ID.
 * @param {Object} payload - Request body.
 * @param {Actor} actor - Admin or custodian.
 * @returns {Promise<ItemUnitRecord[]>} The item's units.
 * @throws {import('../utils/errors.js').AppError} 400 invalid, 404 not found.
 */
export const updateUnit = async (itemId, unitId, payload, actor) =>
  db.transaction(async (trx) => {
    const item = await getUnitTrackedItemForUpdate(itemId, trx);
    const before = await getUnitForUpdate(itemId, unitId, trx);
    const values = await validateUnitPayload(payload, item, before, trx);

    await itemsRepository.updateUnits([unitId], values, trx);
    const units = await itemsRepository.listUnits(itemId, trx);

    await writeAudit(
      {
        action: AUDIT_ACTIONS.UPDATE,
        entityType: ENTITY_TYPES.ITEM_UNIT,
        entityId: unitId,
        before,
        after: units.find((unit) => unit.id === unitId),
      },
      actor,
      trx,
    );

    return units;
  });

/**
 * Changes a unit's status by hand (available, under repair, lost, disposed) with a reason.
 * Moving a unit into or out of "available" changes quantity on hand by one and writes an
 * adjustment ledger entry. Borrowed units change only through returns; disposed is final.
 * @param {number} itemId - Item ID.
 * @param {number} unitId - Unit ID.
 * @param {{ status?: string, remarks?: string }} payload - Request body.
 * @param {Actor} actor - Admin or custodian.
 * @returns {Promise<ItemUnitRecord[]>} The item's units.
 * @throws {import('../utils/errors.js').AppError} 400 invalid, 404 not found, 409 borrowed/disposed.
 */
export const changeUnitStatus = async (itemId, unitId, payload, actor) => {
  const remarks = typeof payload.remarks === 'string' ? payload.remarks.trim() : '';
  const errors = {};

  if (!isOneOf(payload.status, MANUAL_UNIT_STATUSES)) {
    errors.status = 'Choose available, under repair, lost or disposed';
  }

  if (!isRequired(remarks)) {
    errors.remarks = 'A reason is required';
  } else if (!isMaxLength(remarks, 255)) {
    errors.remarks = 'Use at most 255 characters';
  }

  throwIfInvalid(errors);

  return db.transaction(async (trx) => {
    await getUnitTrackedItemForUpdate(itemId, trx);
    const before = await getUnitForUpdate(itemId, unitId, trx);

    if (before.status === UNIT_STATUS.BORROWED) {
      throw createAppError('This unit is borrowed. Record its return instead.', 409);
    }

    if (before.status === UNIT_STATUS.DISPOSED) {
      throw createAppError('Disposed units cannot change status', 409);
    }

    if (before.status === payload.status) {
      throw createAppError('The unit already has this status', 409);
    }

    const wasAvailable = before.status === UNIT_STATUS.AVAILABLE;
    const isAvailable = payload.status === UNIT_STATUS.AVAILABLE;
    const delta = Number(isAvailable) - Number(wasAvailable);

    await itemsRepository.updateUnits([unitId], { status: payload.status }, trx);

    if (delta !== 0) {
      await itemsRepository.adjustQuantity(itemId, delta, actor.id, trx);

      await stockTransactionsRepository.create(
        {
          itemId,
          itemUnitId: unitId,
          type: TRANSACTION_TYPES.ADJUSTMENT,
          quantity: delta,
          referenceType: REFERENCE_TYPES.ITEM_UNIT,
          referenceId: unitId,
          remarks: `${before.propertyNo}: ${before.status} to ${payload.status}. ${remarks}`,
          performedBy: actor.id,
        },
        trx,
      );
    }

    const units = await itemsRepository.listUnits(itemId, trx);

    await writeAudit(
      {
        action: AUDIT_ACTIONS.STATUS_CHANGE,
        entityType: ENTITY_TYPES.ITEM_UNIT,
        entityId: unitId,
        before: { status: before.status },
        after: { status: payload.status, remarks },
      },
      actor,
      trx,
    );

    return units;
  });
};
