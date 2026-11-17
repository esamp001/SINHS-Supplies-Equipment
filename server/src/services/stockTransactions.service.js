import { db } from '../config/db.js';
import * as auditLogsRepository from '../repositories/auditLogs.repository.js';
import * as itemsRepository from '../repositories/items.repository.js';
import * as stockTransactionsRepository from '../repositories/stockTransactions.repository.js';
import { createAppError, throwIfInvalid } from '../utils/errors.js';
import {
  AUDIT_ACTIONS,
  ENTITY_TYPES,
  TRACKING_MODES,
  TRANSACTION_TYPES,
} from '../utils/constants.js';
import { buildMeta, parsePagination } from '../utils/pagination.js';
import {
  isMaxLength,
  isNonZeroInt,
  isOneOf,
  isPositiveInt,
  isRequired,
  isValidDate,
} from '../utils/validators.js';

/**
 * @typedef {import('../repositories/stockTransactions.repository.js').StockTransactionRecord} StockTransactionRecord
 * @typedef {import('../utils/requestParsers.js').Actor} Actor
 */

/** Largest quantity accepted in one stock-in or adjustment. */
const MAX_QUANTITY_PER_ENTRY = 100000;

/**
 * Builds ledger filters from query parameters, ignoring invalid values.
 * @param {{ itemId?: string, type?: string, dateFrom?: string, dateTo?: string, search?: string }} query - Query parameters.
 * @returns {{ itemId?: number, type?: string, dateFrom?: string, dateTo?: string, search: string }} Filters.
 */
export const buildTransactionFilters = (query) => ({
  itemId: isPositiveInt(query.itemId) ? Number(query.itemId) : undefined,
  type: isOneOf(query.type, Object.values(TRANSACTION_TYPES)) ? query.type : undefined,
  dateFrom: isValidDate(query.dateFrom) ? query.dateFrom : undefined,
  dateTo: isValidDate(query.dateTo) ? query.dateTo : undefined,
  search: (query.search || '').trim(),
});

/**
 * Lists ledger entries, newest first, with pagination.
 * @param {Object} query - Query parameters (page, pageSize, itemId, type, dateFrom, dateTo, search).
 * @returns {Promise<{ rows: StockTransactionRecord[], meta: Object }>} Page of entries.
 */
export const listTransactions = async (query) => {
  const pagination = parsePagination(query);

  const { rows, total } = await stockTransactionsRepository.list(
    buildTransactionFilters(query),
    pagination,
  );

  return { rows, meta: buildMeta(pagination, total) };
};

/**
 * Validates the shared parts of a stock-in or adjustment payload.
 * @param {{ itemId?: number, quantity?: number, remarks?: string }} payload - Request body.
 * @param {{ isAdjustment: boolean }} options - Adjustments allow negative quantities and need a reason.
 * @returns {{ itemId: number, quantity: number, remarks: string }} Clean values.
 * @throws {import('../utils/errors.js').AppError} 400 with field errors.
 */
const validateStockPayload = (payload, { isAdjustment }) => {
  const remarks = typeof payload.remarks === 'string' ? payload.remarks.trim() : '';
  const quantity = Number(payload.quantity);
  const errors = {};

  if (!isPositiveInt(payload.itemId)) {
    errors.itemId = 'Choose an item';
  }

  if (isAdjustment && !isNonZeroInt(payload.quantity)) {
    errors.quantity = 'Enter a whole number other than zero (negative to remove)';
  } else if (!isAdjustment && !isPositiveInt(payload.quantity)) {
    errors.quantity = 'Quantity must be a positive whole number';
  } else if (Math.abs(quantity) > MAX_QUANTITY_PER_ENTRY) {
    errors.quantity = `Use at most ${MAX_QUANTITY_PER_ENTRY} per entry`;
  }

  if (isAdjustment && !isRequired(remarks)) {
    errors.remarks = 'A reason is required for adjustments';
  } else if (!isMaxLength(remarks, 255)) {
    errors.remarks = 'Use at most 255 characters';
  }

  throwIfInvalid(errors);

  return { itemId: Number(payload.itemId), quantity, remarks };
};

/**
 * Applies a quantity change to a quantity-tracked item inside one transaction: locks the item
 * row, checks stock never goes negative, updates quantity on hand and writes the ledger entry.
 * @param {{ itemId: number, quantity: number, remarks: string, type: string, auditAction: string }} change - Change to apply.
 * @param {Actor} actor - Custodian or admin.
 * @returns {Promise<import('../repositories/items.repository.js').ItemRecord>} Updated item.
 * @throws {import('../utils/errors.js').AppError} 404 item not found, 409 unit-tracked or insufficient stock.
 */
const applyStockChange = async (change, actor) =>
  db.transaction(async (trx) => {
    const before = await itemsRepository.findByIdForUpdate(change.itemId, trx);

    if (!before) {
      throw createAppError('Item not found', 404);
    }

    if (before.trackingMode === TRACKING_MODES.UNIT) {
      throw createAppError(
        'This item is tracked by unit. Register or change individual units instead.',
        409,
      );
    }

    if (before.quantityOnHand + change.quantity < 0) {
      throw createAppError(`Insufficient stock for item '${before.name}'`, 409, {
        quantity: `Only ${before.quantityOnHand} ${before.unitName} on hand`,
      });
    }

    await itemsRepository.adjustQuantity(change.itemId, change.quantity, actor.id, trx);

    const transactionId = await stockTransactionsRepository.create(
      {
        itemId: change.itemId,
        type: change.type,
        quantity: change.quantity,
        remarks: change.remarks || null,
        performedBy: actor.id,
      },
      trx,
    );

    const after = await itemsRepository.findById(change.itemId, trx);

    await auditLogsRepository.create(
      {
        userId: actor.id,
        action: change.auditAction,
        entityType: ENTITY_TYPES.STOCK_TRANSACTION,
        entityId: transactionId,
        before: { itemId: before.id, quantityOnHand: before.quantityOnHand },
        after: {
          itemId: after.id,
          quantityOnHand: after.quantityOnHand,
          quantity: change.quantity,
          remarks: change.remarks || null,
        },
        ipAddress: actor.ipAddress,
      },
      trx,
    );

    return after;
  });

/**
 * Records a stock-in (delivery, purchase, donation) for a quantity-tracked item.
 * Stock-in is not a request; it still writes a ledger entry (AGENTS.md §9).
 * @param {{ itemId?: number, quantity?: number, remarks?: string }} payload - Request body.
 * @param {Actor} actor - Custodian or admin.
 * @returns {Promise<import('../repositories/items.repository.js').ItemRecord>} Updated item.
 * @throws {import('../utils/errors.js').AppError} 400 invalid, 404 not found, 409 unit-tracked.
 */
export const stockIn = async (payload, actor) => {
  const values = validateStockPayload(payload, { isAdjustment: false });

  return applyStockChange(
    { ...values, type: TRANSACTION_TYPES.STOCK_IN, auditAction: AUDIT_ACTIONS.STOCK_IN },
    actor,
  );
};

/**
 * Records a stock adjustment (count correction, disposal, spoilage) with a required reason.
 * The quantity is signed; stock never goes below zero.
 * @param {{ itemId?: number, quantity?: number, remarks?: string }} payload - Request body.
 * @param {Actor} actor - Custodian or admin.
 * @returns {Promise<import('../repositories/items.repository.js').ItemRecord>} Updated item.
 * @throws {import('../utils/errors.js').AppError} 400 invalid, 404 not found, 409 unit-tracked or insufficient stock.
 */
export const adjustStock = async (payload, actor) => {
  const values = validateStockPayload(payload, { isAdjustment: true });

  return applyStockChange(
    { ...values, type: TRANSACTION_TYPES.ADJUSTMENT, auditAction: AUDIT_ACTIONS.ADJUSTMENT },
    actor,
  );
};

/**
 * Lists items whose quantity on hand doesn't match the ledger (or available units).
 * An empty list means inventory and ledger agree (AGENTS.md §9).
 * @returns {Promise<Array<Object>>} Mismatched items.
 */
export const getReconciliation = async () => stockTransactionsRepository.listMismatches();
