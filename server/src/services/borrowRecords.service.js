import { db } from '../config/db.js';
import * as auditLogsRepository from '../repositories/auditLogs.repository.js';
import * as borrowRecordsRepository from '../repositories/borrowRecords.repository.js';
import * as itemsRepository from '../repositories/items.repository.js';
import * as notificationsRepository from '../repositories/notifications.repository.js';
import * as requestsRepository from '../repositories/requests.repository.js';
import * as stockTransactionsRepository from '../repositories/stockTransactions.repository.js';
import * as usersRepository from '../repositories/users.repository.js';
import { createAppError, throwIfInvalid } from '../utils/errors.js';
import {
  AUDIT_ACTIONS,
  BORROW_STATUS,
  ENTITY_TYPES,
  NOTIFICATION_TYPES,
  REFERENCE_TYPES,
  REQUEST_STATUS,
  RETURN_CONDITIONS,
  ROLES,
  TRACKING_MODES,
  TRANSACTION_TYPES,
  UNIT_STATUS,
} from '../utils/constants.js';
import { addDays, formatManilaDate, toManilaDate } from '../utils/dates.js';
import { buildMeta, parsePagination } from '../utils/pagination.js';
import { isMaxLength, isOneOf, isPositiveInt, isRequired } from '../utils/validators.js';

/**
 * @typedef {import('../repositories/borrowRecords.repository.js').BorrowRecordRecord} BorrowRecordRecord
 * @typedef {import('../repositories/borrowRecords.repository.js').BorrowRecordItemRecord} BorrowRecordItemRecord
 * @typedef {import('../utils/requestParsers.js').Actor} Actor
 */

/** Filter values accepted for the borrow record list. */
const LIST_STATUSES = ['borrowed', 'returned', 'overdue'];

/** Unit status after a unit-tracked item is returned in each condition. */
const UNIT_STATUS_BY_CONDITION = Object.freeze({
  [RETURN_CONDITIONS.GOOD]: UNIT_STATUS.AVAILABLE,
  [RETURN_CONDITIONS.DAMAGED]: UNIT_STATUS.UNDER_REPAIR,
  [RETURN_CONDITIONS.LOST]: UNIT_STATUS.LOST,
});

/**
 * Whether the actor manages borrowing (Custodian, or Admin as a fallback).
 * @param {Actor} actor - Signed-in user.
 * @returns {boolean} True for custodians and admins.
 */
const canManage = (actor) => isOneOf(actor.roleCode, [ROLES.CUSTODIAN, ROLES.ADMIN]);

/**
 * Lists borrow records. Staff only see their own.
 * @param {{ page?: string, pageSize?: string, status?: string, search?: string }} query - Query parameters.
 * @param {Actor} actor - Signed-in user.
 * @returns {Promise<{ rows: BorrowRecordRecord[], meta: Object }>} Page of records.
 */
export const listBorrowRecords = async (query, actor) => {
  const pagination = parsePagination(query);

  const filters = {
    status: isOneOf(query.status, LIST_STATUSES) ? query.status : undefined,
    borrowerId: canManage(actor) ? undefined : actor.id,
    search: (query.search || '').trim(),
  };

  const { rows, total } = await borrowRecordsRepository.list(filters, pagination);

  return { rows, meta: buildMeta(pagination, total) };
};

/**
 * Returns a borrow record with its items. Staff can only open their own.
 * @param {number} id - Borrow record ID.
 * @param {Actor} actor - Signed-in user.
 * @returns {Promise<BorrowRecordRecord & { items: BorrowRecordItemRecord[] }>} Record detail.
 * @throws {import('../utils/errors.js').AppError} 404 when not found or not visible.
 */
export const getBorrowRecord = async (id, actor) => {
  const record = await borrowRecordsRepository.findById(id);

  if (!record || (!canManage(actor) && record.borrowerId !== actor.id)) {
    throw createAppError('Borrow record not found', 404);
  }

  return { ...record, items: await borrowRecordsRepository.listItems(id) };
};

/**
 * Puts a returned line back in stock when it came back in good condition, and updates the unit
 * status for unit-tracked items. Damaged or lost items do not restore usable stock (AGENTS.md §9).
 * @param {BorrowRecordItemRecord} line - Borrowed line.
 * @param {string} condition - Return condition.
 * @param {number} recordId - Borrow record ID (ledger reference).
 * @param {Actor} actor - Custodian.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<void>}
 */
const restockReturnedLine = async (line, condition, recordId, actor, trx) => {
  await itemsRepository.findByIdForUpdate(line.itemId, trx);

  if (line.trackingMode === TRACKING_MODES.UNIT && line.itemUnitId) {
    await itemsRepository.updateUnits(
      [line.itemUnitId],
      { status: UNIT_STATUS_BY_CONDITION[condition], condition },
      trx,
    );
  }

  if (condition !== RETURN_CONDITIONS.GOOD) {
    return;
  }

  await itemsRepository.adjustQuantity(line.itemId, line.quantity, actor.id, trx);

  await stockTransactionsRepository.create(
    {
      itemId: line.itemId,
      itemUnitId: line.itemUnitId,
      type: TRANSACTION_TYPES.RETURN,
      quantity: line.quantity,
      referenceType: REFERENCE_TYPES.BORROW_RECORD,
      referenceId: recordId,
      remarks: `Returned${line.propertyNo ? ` ${line.propertyNo}` : ''} (record #${recordId})`,
      performedBy: actor.id,
    },
    trx,
  );
};

/**
 * Records the return of some or all items of a borrow record with their condition.
 * When every item is back, the record and its request become "returned".
 * @param {number} id - Borrow record ID.
 * @param {{ items?: Array<{ borrowRecordItemId: number, condition: string, remarks?: string }> }} payload - Request body.
 * @param {Actor} actor - Custodian (or Admin).
 * @returns {Promise<BorrowRecordRecord & { items: BorrowRecordItemRecord[] }>} Updated record.
 * @throws {import('../utils/errors.js').AppError} 400 invalid, 404 not found, 409 already returned.
 */
export const returnItems = async (id, payload, actor) => {
  const entries = Array.isArray(payload.items) ? payload.items : [];
  const errors = {};

  if (!entries.length) {
    errors.items = 'Choose at least one item to return';
  }

  entries.forEach((entry, index) => {
    const remarks = typeof entry?.remarks === 'string' ? entry.remarks.trim() : '';

    if (!isPositiveInt(entry?.borrowRecordItemId)) {
      errors[`items.${index}.borrowRecordItemId`] = 'Choose an item';
    }

    if (!isOneOf(entry?.condition, Object.values(RETURN_CONDITIONS))) {
      errors[`items.${index}.condition`] = 'Choose good, damaged or lost';
    } else if (entry.condition !== RETURN_CONDITIONS.GOOD && !isRequired(remarks)) {
      errors[`items.${index}.remarks`] = 'Describe the damage or loss';
    }

    if (!isMaxLength(remarks, 255)) {
      errors[`items.${index}.remarks`] = 'Use at most 255 characters';
    }
  });

  throwIfInvalid(errors);

  return db.transaction(async (trx) => {
    const before = await borrowRecordsRepository.findByIdForUpdate(id, trx);

    if (!before) {
      throw createAppError('Borrow record not found', 404);
    }

    if (before.status !== BORROW_STATUS.BORROWED) {
      throw createAppError('Everything on this record was already returned', 409);
    }

    const lines = await borrowRecordsRepository.listItems(id, trx);

    for (const entry of entries) {
      const line = lines.find((candidate) => candidate.id === Number(entry.borrowRecordItemId));

      if (!line || line.returnedAt) {
        throw createAppError('An item was already returned or is not on this record', 409);
      }

      const remarks = typeof entry.remarks === 'string' ? entry.remarks.trim() : '';

      await borrowRecordsRepository.updateItem(
        line.id,
        { return_condition: entry.condition, returned_at: trx.fn.now(), remarks: remarks || null },
        trx,
      );

      await restockReturnedLine(line, entry.condition, id, actor, trx);
    }

    const remainingLines = await borrowRecordsRepository.listItems(id, trx);
    const isFullyReturned = remainingLines.every((line) => line.returnedAt);

    if (isFullyReturned) {
      await borrowRecordsRepository.update(
        id,
        { status: BORROW_STATUS.RETURNED, returned_at: trx.fn.now(), received_by: actor.id },
        trx,
      );

      await requestsRepository.update(before.requestId, { status: REQUEST_STATUS.RETURNED }, trx);
    } else {
      await borrowRecordsRepository.update(id, { received_by: actor.id }, trx);
    }

    const after = await borrowRecordsRepository.findById(id, trx);

    await auditLogsRepository.create(
      {
        userId: actor.id,
        action: AUDIT_ACTIONS.RETURN,
        entityType: ENTITY_TYPES.BORROW_RECORD,
        entityId: id,
        before: { status: before.status },
        after: { status: after.status, returned: entries },
        ipAddress: actor.ipAddress,
      },
      trx,
    );

    await notificationsRepository.createForUsers(
      [before.borrowerId],
      {
        type: NOTIFICATION_TYPES.BORROW_RETURNED,
        title: isFullyReturned ? `Borrow #${id} fully returned` : `Borrow #${id} partly returned`,
        message: `The custodian recorded the return of ${entries.length} item(s).`,
        link: '/my-borrowed',
      },
      trx,
    );

    return { ...after, items: remainingLines };
  });
};

/**
 * Daily check (AGENTS.md §9): reminds borrowers (and custodians) about items due tomorrow and
 * items that are overdue. Each reminder is sent once per borrow record thanks to dedupe keys,
 * so running the check again never creates duplicates.
 * @returns {Promise<{ dueSoon: number, overdue: number }>} Number of records checked per kind.
 */
export const sendBorrowReminders = async () => {
  const tomorrow = addDays(toManilaDate(), 1);

  const [dueSoon, overdue, custodianIds] = await Promise.all([
    borrowRecordsRepository.listDueBetween({ fromDate: tomorrow, toDate: tomorrow }),
    borrowRecordsRepository.listOverdue(),
    usersRepository.listActiveIdsByRole(ROLES.CUSTODIAN),
  ]);

  for (const record of dueSoon) {
    await notificationsRepository.createForUsers([record.borrowerId], {
      type: NOTIFICATION_TYPES.BORROW_DUE_SOON,
      title: `Borrowed items due tomorrow (#${record.id})`,
      message: `Please return ${record.itemSummary} by ${formatManilaDate(record.dueAt)}.`,
      link: '/my-borrowed',
      dedupeKey: `borrow_due_soon:${record.id}`,
    });

    await notificationsRepository.createForUsers(custodianIds, {
      type: NOTIFICATION_TYPES.BORROW_DUE_SOON,
      title: `Borrow #${record.id} is due tomorrow`,
      message: `${record.itemSummary} is due ${formatManilaDate(record.dueAt)}.`,
      link: '/borrowing',
      dedupeKey: `borrow_due_soon:${record.id}`,
    });
  }

  for (const record of overdue) {
    await notificationsRepository.createForUsers([record.borrowerId], {
      type: NOTIFICATION_TYPES.BORROW_OVERDUE,
      title: `Borrowed items are overdue (#${record.id})`,
      message: `${record.itemSummary} was due ${formatManilaDate(record.dueAt)}. Please return it.`,
      link: '/my-borrowed',
      dedupeKey: `borrow_overdue:${record.id}`,
    });

    await notificationsRepository.createForUsers(custodianIds, {
      type: NOTIFICATION_TYPES.BORROW_OVERDUE,
      title: `Borrow #${record.id} is overdue`,
      message: `${record.itemSummary} was due ${formatManilaDate(record.dueAt)}.`,
      link: '/borrowing',
      dedupeKey: `borrow_overdue:${record.id}`,
    });
  }

  return { dueSoon: dueSoon.length, overdue: overdue.length };
};
