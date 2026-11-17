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
  ENTITY_TYPES,
  ITEM_KINDS,
  NOTIFICATION_TYPES,
  REFERENCE_TYPES,
  REQUEST_STATUS,
  REQUEST_TYPES,
  ROLES,
  TRACKING_MODES,
  TRANSACTION_TYPES,
  UNIT_STATUS,
} from '../utils/constants.js';
import { daysBetween, formatManilaDate, toManilaDate } from '../utils/dates.js';
import { buildMeta, parsePagination } from '../utils/pagination.js';
import {
  isMaxLength,
  isNonNegativeInt,
  isOneOf,
  isPositiveInt,
  isRequired,
  isValidDate,
} from '../utils/validators.js';

/**
 * @typedef {import('../repositories/requests.repository.js').RequestRecord} RequestRecord
 * @typedef {import('../repositories/requests.repository.js').RequestItemRecord} RequestItemRecord
 * @typedef {import('../utils/requestParsers.js').Actor} Actor
 */

/** Most different items allowed in one request. */
const MAX_ITEMS_PER_REQUEST = 50;

/** Largest quantity allowed per requested item. */
const MAX_QUANTITY_PER_ITEM = 10000;

/** Request and borrow due times are the end of the chosen Manila day. */
const END_OF_DAY = '23:59:59';

/** In-app links used in notifications. */
const LINKS = Object.freeze({
  REVIEW: '/requests',
  MY_REQUESTS: '/my-requests',
});

/**
 * Whether the actor can review requests (Custodian, or Admin as a fallback).
 * @param {Actor} actor - Signed-in user.
 * @returns {boolean} True for custodians and admins.
 */
const canReview = (actor) => isOneOf(actor.roleCode, [ROLES.CUSTODIAN, ROLES.ADMIN]);

/**
 * Writes an audit log entry for a request.
 * @param {{ action: string, entityId: number, before?: Object | null, after?: Object | null }} entry - What changed.
 * @param {Actor} actor - User making the change.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<void>}
 */
const writeAudit = async (entry, actor, trx) => {
  await auditLogsRepository.create(
    {
      userId: actor.id,
      action: entry.action,
      entityType: ENTITY_TYPES.REQUEST,
      entityId: entry.entityId,
      before: entry.before || null,
      after: entry.after || null,
      ipAddress: actor.ipAddress,
    },
    trx,
  );
};

/**
 * Returns the IDs of active custodians (they review requests).
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<number[]>} User IDs.
 */
const listCustodianIds = async (trx) => usersRepository.listActiveIdsByRole(ROLES.CUSTODIAN, trx);

/**
 * Lists requests. Staff only ever see their own; reviewers see all (or only theirs with `mine`).
 * @param {{ page?: string, pageSize?: string, status?: string, requestType?: string, search?: string, mine?: string }} query - Query parameters.
 * @param {Actor} actor - Signed-in user.
 * @returns {Promise<{ rows: RequestRecord[], meta: Object }>} Page of requests.
 */
export const listRequests = async (query, actor) => {
  const pagination = parsePagination(query);
  const onlyMine = !canReview(actor) || query.mine === 'true';

  const statuses = String(query.status || '')
    .split(',')
    .filter((status) => isOneOf(status, Object.values(REQUEST_STATUS)));

  const filters = {
    statuses,
    requestType: isOneOf(query.requestType, Object.values(REQUEST_TYPES))
      ? query.requestType
      : undefined,
    requestedBy: onlyMine ? actor.id : undefined,
    search: (query.search || '').trim(),
  };

  const { rows, total } = await requestsRepository.list(filters, pagination);

  return { rows, meta: buildMeta(pagination, total) };
};

/**
 * Loads a request the actor may see, or throws 404 (staff can't see other people's requests).
 * @param {number} id - Request ID.
 * @param {Actor} actor - Signed-in user.
 * @returns {Promise<RequestRecord>} Request.
 * @throws {import('../utils/errors.js').AppError} 404 when not found or not visible.
 */
const getVisibleRequest = async (id, actor) => {
  const request = await requestsRepository.findById(id);

  if (!request || (!canReview(actor) && request.requestedBy !== actor.id)) {
    throw createAppError('Request not found', 404);
  }

  return request;
};

/**
 * Returns a request with its items and, once released, its borrow record ID and units.
 * @param {number} id - Request ID.
 * @param {Actor} actor - Signed-in user.
 * @returns {Promise<RequestRecord & { items: RequestItemRecord[], borrowRecordId: number | null, availableUnits: Object<number, Array<Object>> }>} Request detail.
 * @throws {import('../utils/errors.js').AppError} 404 when not found or not visible.
 */
export const getRequest = async (id, actor) => {
  const request = await getVisibleRequest(id, actor);
  const items = await requestsRepository.listItems(id);
  const borrowRecord = await borrowRecordsRepository.findByRequestId(id);
  const availableUnits = {};

  const needsUnitPicker =
    canReview(actor) &&
    request.status === REQUEST_STATUS.APPROVED &&
    request.requestType === REQUEST_TYPES.BORROW;

  if (needsUnitPicker) {
    for (const item of items.filter((row) => row.trackingMode === TRACKING_MODES.UNIT)) {
      const units = await itemsRepository.listUnits(item.itemId);

      availableUnits[item.id] = units
        .filter((unit) => unit.status === UNIT_STATUS.AVAILABLE)
        .map((unit) => ({ id: unit.id, propertyNo: unit.propertyNo, serialNo: unit.serialNo }));
    }
  }

  return { ...request, items, borrowRecordId: borrowRecord?.id || null, availableUnits };
};

/**
 * Validates the requested items list and loads the items.
 * @param {*} rawItems - `items` from the request body.
 * @param {string} requestType - 'supply' or 'borrow'.
 * @param {Object<string, string>} errors - Collected field errors (mutated).
 * @returns {Promise<Array<{ item: import('../repositories/items.repository.js').ItemRecord, quantity: number }>>} Valid lines.
 */
const validateRequestLines = async (rawItems, requestType, errors) => {
  if (!Array.isArray(rawItems) || !rawItems.length) {
    errors.items = 'Add at least one item';

    return [];
  }

  if (rawItems.length > MAX_ITEMS_PER_REQUEST) {
    errors.items = `Request at most ${MAX_ITEMS_PER_REQUEST} different items`;

    return [];
  }

  const itemIds = rawItems.map((line) => Number(line?.itemId));

  if (new Set(itemIds).size !== itemIds.length) {
    errors.items = 'Each item can be listed only once';

    return [];
  }

  const items = await itemsRepository.findByIds(itemIds.filter((id) => isPositiveInt(id)));

  const expectedKind =
    requestType === REQUEST_TYPES.BORROW ? ITEM_KINDS.EQUIPMENT : ITEM_KINDS.SUPPLY;

  const lines = [];

  rawItems.forEach((line, index) => {
    const item = items.find((candidate) => candidate.id === Number(line?.itemId));
    const quantity = Number(line?.quantity);

    if (!item || !item.isTypeActive) {
      errors[`items.${index}.itemId`] = 'This item is not available';

      return;
    }

    if (item.kind !== expectedKind) {
      errors[`items.${index}.itemId`] =
        expectedKind === ITEM_KINDS.SUPPLY
          ? `${item.name} is equipment. Use a borrow request.`
          : `${item.name} is a supply. Use a supply request.`;

      return;
    }

    if (!isPositiveInt(line?.quantity) || quantity > MAX_QUANTITY_PER_ITEM) {
      errors[`items.${index}.quantity`] = 'Quantity must be a positive whole number';

      return;
    }

    if (quantity > item.quantityOnHand) {
      errors[`items.${index}.quantity`] = `Only ${item.quantityOnHand} ${item.unitName} available`;

      return;
    }

    lines.push({ item, quantity });
  });

  return lines;
};

/**
 * Returns the strictest borrow limit (in days) across the borrowed items, or null for no limit.
 * @param {Array<{ maxBorrowDays: number | null }>} items - Items being borrowed.
 * @returns {number | null} Days.
 */
const getStrictestBorrowLimit = (items) => {
  const limits = items.map((item) => item.maxBorrowDays).filter((days) => days !== null);

  return limits.length ? Math.min(...limits) : null;
};

/**
 * Submits a supply or borrow request. Every release of stock starts here (AGENTS.md §9).
 * @param {{ requestType?: string, purpose?: string, neededAt?: string, dueDate?: string, items?: Array<{ itemId: number, quantity: number }> }} payload - Request body.
 * @param {Actor} actor - Requester.
 * @returns {Promise<RequestRecord>} Created (pending) request.
 * @throws {import('../utils/errors.js').AppError} 400 with field errors.
 */
export const createRequest = async (payload, actor) => {
  const { requestType, neededAt, dueDate } = payload;
  const purpose = typeof payload.purpose === 'string' ? payload.purpose.trim() : '';
  const today = toManilaDate();
  const isBorrow = requestType === REQUEST_TYPES.BORROW;
  const errors = {};

  if (!isOneOf(requestType, Object.values(REQUEST_TYPES))) {
    errors.requestType = 'Choose supply or borrow';
  }

  if (!isRequired(purpose)) {
    errors.purpose = 'Say what the items are for';
  } else if (!isMaxLength(purpose, 500)) {
    errors.purpose = 'Use at most 500 characters';
  }

  if (!isValidDate(neededAt)) {
    errors.neededAt = 'Choose the date you need the items';
  } else if (neededAt < today) {
    errors.neededAt = 'The needed date cannot be in the past';
  }

  const lines = requestType ? await validateRequestLines(payload.items, requestType, errors) : [];

  if (isBorrow && !isValidDate(dueDate)) {
    errors.dueDate = 'Choose the return date';
  } else if (isBorrow && isValidDate(neededAt) && dueDate < neededAt) {
    errors.dueDate = 'The return date must be on or after the needed date';
  } else if (isBorrow && isValidDate(neededAt) && lines.length) {
    const limit = getStrictestBorrowLimit(lines.map((line) => line.item));

    if (limit !== null && daysBetween(neededAt, dueDate) > limit) {
      errors.dueDate = `These items can be borrowed for at most ${limit} day(s)`;
    }
  }

  throwIfInvalid(errors);

  return db.transaction(async (trx) => {
    const id = await requestsRepository.create(
      {
        request_type: requestType,
        requested_by: actor.id,
        purpose,
        needed_at: neededAt,
        due_at: isBorrow ? `${dueDate} ${END_OF_DAY}` : null,
        status: REQUEST_STATUS.PENDING,
      },
      trx,
    );

    await requestsRepository.createItems(
      lines.map((line) => ({
        request_id: id,
        item_id: line.item.id,
        requested_quantity: line.quantity,
      })),
      trx,
    );

    const after = await requestsRepository.findById(id, trx);

    await writeAudit({ action: AUDIT_ACTIONS.CREATE, entityId: id, after }, actor, trx);

    await notificationsRepository.createForUsers(
      (await listCustodianIds(trx)).filter((userId) => userId !== actor.id),
      {
        type: NOTIFICATION_TYPES.REQUEST_SUBMITTED,
        title: `New ${requestType} request #${id}`,
        message: `${actor.fullName} requested ${after.itemSummary}.`,
        link: LINKS.REVIEW,
      },
      trx,
    );

    return after;
  });
};

/**
 * Loads a request with a row lock and checks its status, or throws.
 * @param {number} id - Request ID.
 * @param {string} expectedStatus - Status the request must have.
 * @param {string} actionLabel - Used in the error message, e.g. "approved".
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<RequestRecord>} Request.
 * @throws {import('../utils/errors.js').AppError} 404 not found, 409 wrong status.
 */
const getRequestForTransition = async (id, expectedStatus, actionLabel, trx) => {
  const request = await requestsRepository.findByIdForUpdate(id, trx);

  if (!request) {
    throw createAppError('Request not found', 404);
  }

  if (request.status !== expectedStatus) {
    throw createAppError(
      `Only ${expectedStatus} requests can be ${actionLabel}. This one is ${request.status}.`,
      409,
    );
  }

  return request;
};

/**
 * Cancels the requester's own pending request.
 * @param {number} id - Request ID.
 * @param {Actor} actor - Requester.
 * @returns {Promise<RequestRecord>} Updated request.
 * @throws {import('../utils/errors.js').AppError} 404 not found or not theirs, 409 not pending.
 */
export const cancelRequest = async (id, actor) =>
  db.transaction(async (trx) => {
    const existing = await requestsRepository.findByIdForUpdate(id, trx);

    if (!existing || existing.requestedBy !== actor.id) {
      throw createAppError('Request not found', 404);
    }

    const before = await getRequestForTransition(id, REQUEST_STATUS.PENDING, 'cancelled', trx);

    await requestsRepository.update(id, { status: REQUEST_STATUS.CANCELLED }, trx);
    const after = await requestsRepository.findById(id, trx);

    await writeAudit(
      {
        action: AUDIT_ACTIONS.CANCEL,
        entityId: id,
        before: { status: before.status },
        after: { status: after.status },
      },
      actor,
      trx,
    );

    return after;
  });

/**
 * Throws 403 when the actor is trying to review their own request (AGENTS.md §9).
 * @param {RequestRecord} request - Request.
 * @param {Actor} actor - Reviewer.
 * @returns {void}
 * @throws {import('../utils/errors.js').AppError} 403 for the requester.
 */
const assertNotOwnRequest = (request, actor) => {
  if (request.requestedBy === actor.id) {
    throw createAppError('You cannot approve or reject your own request', 403);
  }
};

/**
 * Approves a pending request with per-item approved quantities (partial approval allowed).
 * Each approved quantity is 0..requested and no more than current stock; a remark is required
 * when less than requested. For borrow requests the reviewer may shorten the return date.
 * @param {number} id - Request ID.
 * @param {{ items?: Array<{ requestItemId: number, approvedQuantity: number, remarks?: string }>, dueDate?: string }} payload - Request body.
 * @param {Actor} actor - Custodian (or Admin).
 * @returns {Promise<RequestRecord>} Updated request.
 * @throws {import('../utils/errors.js').AppError} 400 invalid, 403 own request, 404 not found, 409 not pending or insufficient stock.
 */
export const approveRequest = async (id, payload, actor) =>
  db.transaction(async (trx) => {
    const before = await getRequestForTransition(id, REQUEST_STATUS.PENDING, 'approved', trx);

    assertNotOwnRequest(before, actor);

    const requestItems = await requestsRepository.listItems(id, trx);
    const decisions = Array.isArray(payload.items) ? payload.items : [];
    const errors = {};
    const approvals = [];

    for (const [index, requestItem] of requestItems.entries()) {
      const decision = decisions.find((entry) => Number(entry?.requestItemId) === requestItem.id);
      const remarks = typeof decision?.remarks === 'string' ? decision.remarks.trim() : '';

      if (!decision || !isNonNegativeInt(decision.approvedQuantity)) {
        errors[`items.${index}.approvedQuantity`] = 'Enter the approved quantity (0 or more)';

        continue;
      }

      const approvedQuantity = Number(decision.approvedQuantity);
      const item = await itemsRepository.findByIdForUpdate(requestItem.itemId, trx);

      if (approvedQuantity > requestItem.requestedQuantity) {
        errors[`items.${index}.approvedQuantity`] =
          `Cannot exceed the requested ${requestItem.requestedQuantity}`;
      } else if (approvedQuantity > item.quantityOnHand) {
        errors[`items.${index}.approvedQuantity`] =
          `Only ${item.quantityOnHand} ${item.unitName} in stock`;
      } else if (approvedQuantity < requestItem.requestedQuantity && !isRequired(remarks)) {
        errors[`items.${index}.remarks`] = 'Add a remark when approving less than requested';
      } else if (!isMaxLength(remarks, 255)) {
        errors[`items.${index}.remarks`] = 'Use at most 255 characters';
      }

      approvals.push({ requestItem, approvedQuantity, remarks });
    }

    let dueAt = before.dueAt;

    if (before.requestType === REQUEST_TYPES.BORROW && payload.dueDate !== undefined) {
      const currentDueDate = formatManilaDate(before.dueAt);

      if (!isValidDate(payload.dueDate)) {
        errors.dueDate = 'Choose a valid return date';
      } else if (payload.dueDate < before.neededAt) {
        errors.dueDate = 'The return date must be on or after the needed date';
      } else if (payload.dueDate > currentDueDate) {
        errors.dueDate = 'You can shorten the borrow period, not extend it';
      } else {
        dueAt = `${payload.dueDate} ${END_OF_DAY}`;
      }
    }

    throwIfInvalid(errors);

    if (approvals.every((approval) => approval.approvedQuantity === 0)) {
      throw createAppError(
        'Approving every item at 0 is a rejection. Reject it with a reason.',
        400,
      );
    }

    for (const approval of approvals) {
      await requestsRepository.updateItem(
        approval.requestItem.id,
        { approved_quantity: approval.approvedQuantity, remarks: approval.remarks || null },
        trx,
      );
    }

    await requestsRepository.update(
      id,
      {
        status: REQUEST_STATUS.APPROVED,
        reviewed_by: actor.id,
        reviewed_at: trx.fn.now(),
        due_at: dueAt,
      },
      trx,
    );

    const after = await requestsRepository.findById(id, trx);

    const isPartial = approvals.some(
      (approval) => approval.approvedQuantity < approval.requestItem.requestedQuantity,
    );

    await writeAudit(
      {
        action: AUDIT_ACTIONS.APPROVE,
        entityId: id,
        before: { status: before.status, items: requestItems },
        after: {
          status: after.status,
          dueAt: after.dueAt,
          items: approvals.map((approval) => ({
            requestItemId: approval.requestItem.id,
            approvedQuantity: approval.approvedQuantity,
            remarks: approval.remarks || null,
          })),
        },
      },
      actor,
      trx,
    );

    await notificationsRepository.createForUsers(
      [before.requestedBy],
      {
        type: isPartial
          ? NOTIFICATION_TYPES.REQUEST_PARTIALLY_APPROVED
          : NOTIFICATION_TYPES.REQUEST_APPROVED,
        title: `Request #${id} ${isPartial ? 'partially approved' : 'approved'}`,
        message: `Approved: ${after.itemSummary}. Wait for the custodian to release it.`,
        link: LINKS.MY_REQUESTS,
      },
      trx,
    );

    return after;
  });

/**
 * Rejects a pending request. A reason is required.
 * @param {number} id - Request ID.
 * @param {{ reason?: string }} payload - Request body.
 * @param {Actor} actor - Custodian (or Admin).
 * @returns {Promise<RequestRecord>} Updated request.
 * @throws {import('../utils/errors.js').AppError} 400 missing reason, 403 own request, 404 not found, 409 not pending.
 */
export const rejectRequest = async (id, payload, actor) => {
  const reason = typeof payload.reason === 'string' ? payload.reason.trim() : '';
  const errors = {};

  if (!isRequired(reason)) {
    errors.reason = 'A reason is required';
  } else if (!isMaxLength(reason, 255)) {
    errors.reason = 'Use at most 255 characters';
  }

  throwIfInvalid(errors);

  return db.transaction(async (trx) => {
    const before = await getRequestForTransition(id, REQUEST_STATUS.PENDING, 'rejected', trx);

    assertNotOwnRequest(before, actor);

    await requestsRepository.update(
      id,
      {
        status: REQUEST_STATUS.REJECTED,
        reviewed_by: actor.id,
        reviewed_at: trx.fn.now(),
        rejection_reason: reason,
      },
      trx,
    );

    const after = await requestsRepository.findById(id, trx);

    await writeAudit(
      {
        action: AUDIT_ACTIONS.REJECT,
        entityId: id,
        before: { status: before.status },
        after: { status: after.status, rejectionReason: reason },
      },
      actor,
      trx,
    );

    await notificationsRepository.createForUsers(
      [before.requestedBy],
      {
        type: NOTIFICATION_TYPES.REQUEST_REJECTED,
        title: `Request #${id} was rejected`,
        message: `Reason: ${reason}`,
        link: LINKS.MY_REQUESTS,
      },
      trx,
    );

    return after;
  });
};

/**
 * Releases the approved quantity of one supply line: deducts stock and writes a stock-out entry.
 * @param {RequestItemRecord} requestItem - Request item.
 * @param {number} requestId - Request ID (ledger reference).
 * @param {Actor} actor - Custodian.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<void>}
 * @throws {import('../utils/errors.js').AppError} 409 insufficient stock.
 */
const releaseSupplyLine = async (requestItem, requestId, actor, trx) => {
  const quantity = requestItem.approvedQuantity;
  const item = await itemsRepository.findByIdForUpdate(requestItem.itemId, trx);

  if (item.quantityOnHand < quantity) {
    throw createAppError(`Insufficient stock for item '${item.name}'`, 409, {
      [`items.${requestItem.id}`]: `Only ${item.quantityOnHand} ${item.unitName} on hand`,
    });
  }

  await itemsRepository.adjustQuantity(item.id, -quantity, actor.id, trx);

  await stockTransactionsRepository.create(
    {
      itemId: item.id,
      type: TRANSACTION_TYPES.STOCK_OUT,
      quantity: -quantity,
      referenceType: REFERENCE_TYPES.REQUEST,
      referenceId: requestId,
      remarks: `Released for request #${requestId}`,
      performedBy: actor.id,
    },
    trx,
  );

  await requestsRepository.updateItem(requestItem.id, { released_quantity: quantity }, trx);
};

/**
 * Releases one borrow line into a borrow record. Quantity-tracked equipment is deducted as a
 * count; unit-tracked equipment needs the exact available units to hand over.
 * @param {RequestItemRecord} requestItem - Request item.
 * @param {number[]} unitIds - Units picked for this line (unit-tracked only).
 * @param {number} borrowRecordId - Borrow record receiving the items.
 * @param {Actor} actor - Custodian.
 * @param {import('knex').Knex.Transaction} trx - Transaction.
 * @returns {Promise<void>}
 * @throws {import('../utils/errors.js').AppError} 400 wrong units, 409 insufficient stock or unit unavailable.
 */
const releaseBorrowLine = async (requestItem, unitIds, borrowRecordId, actor, trx) => {
  const quantity = requestItem.approvedQuantity;
  const item = await itemsRepository.findByIdForUpdate(requestItem.itemId, trx);

  if (item.quantityOnHand < quantity) {
    throw createAppError(`Insufficient stock for item '${item.name}'`, 409);
  }

  if (item.trackingMode === TRACKING_MODES.QUANTITY) {
    await itemsRepository.adjustQuantity(item.id, -quantity, actor.id, trx);

    await borrowRecordsRepository.createItem(
      { borrow_record_id: borrowRecordId, item_id: item.id, quantity },
      trx,
    );

    await stockTransactionsRepository.create(
      {
        itemId: item.id,
        type: TRANSACTION_TYPES.BORROW,
        quantity: -quantity,
        referenceType: REFERENCE_TYPES.BORROW_RECORD,
        referenceId: borrowRecordId,
        remarks: `Borrowed (record #${borrowRecordId})`,
        performedBy: actor.id,
      },
      trx,
    );

    await requestsRepository.updateItem(requestItem.id, { released_quantity: quantity }, trx);

    return;
  }

  const uniqueUnitIds = [...new Set(unitIds.map(Number))];

  if (uniqueUnitIds.length !== quantity) {
    throw createAppError(`Pick exactly ${quantity} unit(s) of ${item.name}`, 400, {
      [`units.${requestItem.id}`]: `Pick exactly ${quantity} unit(s)`,
    });
  }

  const units = await itemsRepository.findUnitsForUpdate(uniqueUnitIds, trx);

  const isValidPick =
    units.length === quantity &&
    units.every((unit) => unit.itemId === item.id && unit.status === UNIT_STATUS.AVAILABLE);

  if (!isValidPick) {
    throw createAppError(`Some picked units of ${item.name} are no longer available`, 409, {
      [`units.${requestItem.id}`]: 'Pick available units of this item',
    });
  }

  await itemsRepository.updateUnits(uniqueUnitIds, { status: UNIT_STATUS.BORROWED }, trx);
  await itemsRepository.adjustQuantity(item.id, -quantity, actor.id, trx);

  for (const unit of units) {
    await borrowRecordsRepository.createItem(
      { borrow_record_id: borrowRecordId, item_id: item.id, item_unit_id: unit.id, quantity: 1 },
      trx,
    );

    await stockTransactionsRepository.create(
      {
        itemId: item.id,
        itemUnitId: unit.id,
        type: TRANSACTION_TYPES.BORROW,
        quantity: -1,
        referenceType: REFERENCE_TYPES.BORROW_RECORD,
        referenceId: borrowRecordId,
        remarks: `Borrowed ${unit.propertyNo} (record #${borrowRecordId})`,
        performedBy: actor.id,
      },
      trx,
    );
  }

  await requestsRepository.updateItem(requestItem.id, { released_quantity: quantity }, trx);
};

/**
 * Releases an approved request: deducts stock in the same transaction with ledger entries.
 * Supply requests are consumed; borrow requests create a borrow record (status "borrowed").
 * @param {number} id - Request ID.
 * @param {{ units?: Object<string, number[]> }} payload - For unit-tracked equipment: unit IDs per request item ID.
 * @param {Actor} actor - Custodian (or Admin).
 * @returns {Promise<RequestRecord>} Updated request.
 * @throws {import('../utils/errors.js').AppError} 400 unit picks, 404 not found, 409 not approved or insufficient stock.
 */
export const releaseRequest = async (id, payload, actor) =>
  db.transaction(async (trx) => {
    const before = await getRequestForTransition(id, REQUEST_STATUS.APPROVED, 'released', trx);
    const requestItems = await requestsRepository.listItems(id, trx);
    const linesToRelease = requestItems.filter((requestItem) => requestItem.approvedQuantity > 0);
    const unitPicks = payload.units && typeof payload.units === 'object' ? payload.units : {};
    let borrowRecordId = null;

    if (before.requestType === REQUEST_TYPES.BORROW) {
      borrowRecordId = await borrowRecordsRepository.create(
        {
          request_id: id,
          borrower_id: before.requestedBy,
          due_at: before.dueAt,
          issued_by: actor.id,
        },
        trx,
      );
    }

    for (const requestItem of linesToRelease) {
      if (before.requestType === REQUEST_TYPES.SUPPLY) {
        await releaseSupplyLine(requestItem, id, actor, trx);
      } else {
        const picks = Array.isArray(unitPicks[requestItem.id]) ? unitPicks[requestItem.id] : [];

        await releaseBorrowLine(requestItem, picks, borrowRecordId, actor, trx);
      }
    }

    await requestsRepository.update(
      id,
      { status: REQUEST_STATUS.RELEASED, released_by: actor.id, released_at: trx.fn.now() },
      trx,
    );

    const after = await requestsRepository.findById(id, trx);

    await writeAudit(
      {
        action: AUDIT_ACTIONS.RELEASE,
        entityId: id,
        before: { status: before.status },
        after: { status: after.status, borrowRecordId },
      },
      actor,
      trx,
    );

    const dueText = after.dueAt ? ` Return by ${formatManilaDate(after.dueAt)}.` : '';

    await notificationsRepository.createForUsers(
      [before.requestedBy],
      {
        type: NOTIFICATION_TYPES.REQUEST_RELEASED,
        title: `Request #${id} was released`,
        message: `Released: ${after.itemSummary}.${dueText}`,
        link: borrowRecordId ? '/my-borrowed' : LINKS.MY_REQUESTS,
      },
      trx,
    );

    return after;
  });
