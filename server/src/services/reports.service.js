import * as borrowRecordsRepository from '../repositories/borrowRecords.repository.js';
import * as itemsRepository from '../repositories/items.repository.js';
import * as itemTypesRepository from '../repositories/itemTypes.repository.js';
import * as masterDataRepository from '../repositories/masterData.repository.js';
import * as requestsRepository from '../repositories/requests.repository.js';
import * as stockTransactionsRepository from '../repositories/stockTransactions.repository.js';
import { createAppError } from '../utils/errors.js';
import {
  ITEM_KINDS,
  MAX_REPORT_ROWS,
  REPORT_FORMATS,
  REQUEST_STATUS,
  REQUEST_TYPES,
} from '../utils/constants.js';
import { formatManilaDate, formatManilaDateTime, toManilaDate } from '../utils/dates.js';
import { buildExcel, buildPdf } from '../utils/reportExport.js';
import { isOneOf, isPositiveInt, isValidDate } from '../utils/validators.js';
import { buildTransactionFilters } from './stockTransactions.service.js';

/**
 * @typedef {import('../utils/reportExport.js').Report} Report
 * @typedef {import('../utils/requestParsers.js').Actor} Actor
 */

/** Labels used in report cells and filter lines. */
const LABELS = Object.freeze({
  kind: { supply: 'Supply', equipment: 'Equipment' },
  transactionType: {
    stock_in: 'Stock in',
    stock_out: 'Stock out',
    adjustment: 'Adjustment',
    borrow: 'Borrow',
    return: 'Return',
  },
  requestType: { supply: 'Supply', borrow: 'Borrow' },
  borrowStatus: { borrowed: 'Not returned', overdue: 'Overdue', returned: 'Returned' },
});

/**
 * Capitalizes the first letter of a status, e.g. "pending" → "Pending".
 * @param {string} value - Status.
 * @returns {string} Label.
 */
const toLabel = (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : '');

/**
 * Adds "From ... to ..." to the filter lines when a date range is set.
 * @param {string[]} lines - Filter lines (mutated).
 * @param {{ dateFrom?: string, dateTo?: string }} filters - Date filters.
 * @returns {void}
 */
const addDateRangeLine = (lines, filters) => {
  if (filters.dateFrom || filters.dateTo) {
    lines.push(`Date: ${filters.dateFrom || 'start'} to ${filters.dateTo || 'today'}`);
  }
};

/**
 * Stock levels: every item with its quantity on hand and low-stock flag.
 * @param {Object} query - Query parameters (categoryId, itemTypeId, kind, lowStockOnly).
 * @returns {Promise<Omit<Report, 'generatedBy' | 'generatedAt' | 'key'>>} Report body.
 */
const buildStockLevels = async (query) => {
  const filters = {
    categoryId: isPositiveInt(query.categoryId) ? Number(query.categoryId) : undefined,
    itemTypeId: isPositiveInt(query.itemTypeId) ? Number(query.itemTypeId) : undefined,
    kind: isOneOf(query.kind, Object.values(ITEM_KINDS)) ? query.kind : undefined,
    lowStockOnly: query.lowStockOnly === 'true',
  };

  const { rows } = await itemsRepository.list(
    filters,
    { column: 'items.name', order: 'asc' },
    { pageSize: MAX_REPORT_ROWS, offset: 0 },
  );

  const lines = [];

  if (filters.categoryId) {
    const category = await masterDataRepository.findById('categories', filters.categoryId);

    lines.push(`Category: ${category?.name || filters.categoryId}`);
  }

  if (filters.itemTypeId) {
    const itemType = await itemTypesRepository.findById(filters.itemTypeId);

    lines.push(`Item type: ${itemType?.name || filters.itemTypeId}`);
  }

  if (filters.kind) {
    lines.push(`Kind: ${LABELS.kind[filters.kind]}`);
  }

  if (filters.lowStockOnly) {
    lines.push('Low stock only');
  }

  return {
    title: 'Stock levels',
    filters: lines,
    columns: [
      { key: 'code', label: 'Code', width: 12 },
      { key: 'name', label: 'Item', width: 30 },
      { key: 'itemTypeName', label: 'Type', width: 16 },
      { key: 'categoryName', label: 'Category', width: 18 },
      { key: 'locationName', label: 'Location', width: 18 },
      { key: 'quantityOnHand', label: 'On hand', width: 10 },
      { key: 'unitName', label: 'Unit', width: 10 },
      { key: 'reorderLevel', label: 'Reorder level', width: 12 },
      { key: 'stockStatus', label: 'Status', width: 12 },
    ],
    rows: rows.map((item) => {
      let stockStatus = 'OK';

      if (item.quantityOnHand === 0) {
        stockStatus = 'Out of stock';
      } else if (item.quantityOnHand <= item.reorderLevel) {
        stockStatus = 'Low stock';
      }

      return {
        id: item.id,
        code: item.code,
        name: item.name,
        itemTypeName: item.itemTypeName,
        categoryName: item.categoryName || '',
        locationName: item.locationName || '',
        quantityOnHand: item.quantityOnHand,
        unitName: item.unitName,
        reorderLevel: item.reorderLevel,
        stockStatus,
      };
    }),
  };
};

/**
 * Transaction history: the stock ledger for a period.
 * @param {Object} query - Query parameters (dateFrom, dateTo, type, itemId).
 * @returns {Promise<Omit<Report, 'generatedBy' | 'generatedAt' | 'key'>>} Report body.
 */
const buildTransactions = async (query) => {
  const filters = buildTransactionFilters(query);
  const rows = await stockTransactionsRepository.listAll(filters, MAX_REPORT_ROWS);
  const lines = [];

  addDateRangeLine(lines, filters);

  if (filters.type) {
    lines.push(`Type: ${LABELS.transactionType[filters.type]}`);
  }

  if (filters.itemId) {
    const item = await itemsRepository.findById(filters.itemId);

    lines.push(`Item: ${item?.name || filters.itemId}`);
  }

  return {
    title: 'Stock transaction history',
    filters: lines,
    columns: [
      { key: 'createdAt', label: 'Date & time', width: 20 },
      { key: 'itemCode', label: 'Code', width: 12 },
      { key: 'itemName', label: 'Item', width: 28 },
      { key: 'propertyNo', label: 'Property no.', width: 16 },
      { key: 'type', label: 'Type', width: 12 },
      { key: 'quantity', label: 'Qty', width: 8 },
      { key: 'remarks', label: 'Remarks', width: 34 },
      { key: 'performedByName', label: 'Recorded by', width: 20 },
    ],
    rows: rows.map((entry) => ({
      id: entry.id,
      createdAt: formatManilaDateTime(entry.createdAt),
      itemCode: entry.itemCode,
      itemName: entry.itemName,
      propertyNo: entry.propertyNo || '',
      type: LABELS.transactionType[entry.type],
      quantity: entry.quantity > 0 ? `+${entry.quantity}` : String(entry.quantity),
      remarks: entry.remarks || '',
      performedByName: entry.performedByName,
    })),
  };
};

/**
 * Borrowed and overdue equipment.
 * @param {Object} query - Query parameters (status: borrowed | overdue | returned).
 * @returns {Promise<Omit<Report, 'generatedBy' | 'generatedAt' | 'key'>>} Report body.
 */
const buildBorrowedEquipment = async (query) => {
  const status = isOneOf(query.status, Object.keys(LABELS.borrowStatus)) ? query.status : undefined;
  const rows = await borrowRecordsRepository.listAll({ status }, MAX_REPORT_ROWS);

  return {
    title: 'Borrowed equipment',
    filters: status ? [`Status: ${LABELS.borrowStatus[status]}`] : [],
    columns: [
      { key: 'id', label: 'Borrow #', width: 10 },
      { key: 'borrowerName', label: 'Borrower', width: 22 },
      { key: 'itemSummary', label: 'Items', width: 40 },
      { key: 'borrowedAt', label: 'Borrowed', width: 14 },
      { key: 'dueAt', label: 'Return by', width: 14 },
      { key: 'returnedAt', label: 'Returned', width: 14 },
      { key: 'status', label: 'Status', width: 14 },
    ],
    rows: rows.map((record) => ({
      id: record.id,
      borrowerName: record.borrowerName,
      itemSummary: record.itemSummary || '',
      borrowedAt: formatManilaDate(record.borrowedAt),
      dueAt: formatManilaDate(record.dueAt),
      returnedAt: formatManilaDate(record.returnedAt),
      status: record.isOverdue ? 'Overdue' : LABELS.borrowStatus[record.status],
    })),
  };
};

/**
 * Requests submitted in a period.
 * @param {Object} query - Query parameters (dateFrom, dateTo, status, requestType).
 * @returns {Promise<Omit<Report, 'generatedBy' | 'generatedAt' | 'key'>>} Report body.
 */
const buildRequests = async (query) => {
  const filters = {
    statuses: isOneOf(query.status, Object.values(REQUEST_STATUS)) ? [query.status] : [],
    requestType: isOneOf(query.requestType, Object.values(REQUEST_TYPES))
      ? query.requestType
      : undefined,
    dateFrom: isValidDate(query.dateFrom) ? query.dateFrom : undefined,
    dateTo: isValidDate(query.dateTo) ? query.dateTo : undefined,
  };

  const rows = await requestsRepository.listAll(filters, MAX_REPORT_ROWS);
  const lines = [];

  addDateRangeLine(lines, filters);

  if (filters.statuses.length) {
    lines.push(`Status: ${toLabel(filters.statuses[0])}`);
  }

  if (filters.requestType) {
    lines.push(`Type: ${LABELS.requestType[filters.requestType]}`);
  }

  return {
    title: 'Inventory requests',
    filters: lines,
    columns: [
      { key: 'id', label: 'Request #', width: 10 },
      { key: 'createdAt', label: 'Submitted', width: 14 },
      { key: 'requestType', label: 'Type', width: 10 },
      { key: 'requesterName', label: 'Requested by', width: 22 },
      { key: 'itemSummary', label: 'Items', width: 40 },
      { key: 'status', label: 'Status', width: 12 },
      { key: 'reviewerName', label: 'Reviewed by', width: 20 },
    ],
    rows: rows.map((request) => ({
      id: request.id,
      createdAt: formatManilaDate(request.createdAt),
      requestType: LABELS.requestType[request.requestType],
      requesterName: request.requesterName,
      itemSummary: request.itemSummary || '',
      status: toLabel(request.status),
      reviewerName: request.reviewerName || '',
    })),
  };
};

/** Report builders by URL key. */
const REPORT_BUILDERS = Object.freeze({
  'stock-levels': buildStockLevels,
  transactions: buildTransactions,
  'borrowed-equipment': buildBorrowedEquipment,
  requests: buildRequests,
});

/**
 * Builds a report from the same data shown on screen.
 * @param {string} reportKey - Report key from the URL.
 * @param {Object} query - Query parameters (filters).
 * @param {Actor} actor - User generating the report.
 * @returns {Promise<Report>} Report.
 * @throws {import('../utils/errors.js').AppError} 404 for an unknown report.
 */
export const getReport = async (reportKey, query, actor) => {
  if (!Object.hasOwn(REPORT_BUILDERS, reportKey)) {
    throw createAppError('Unknown report', 404);
  }

  const body = await REPORT_BUILDERS[reportKey](query);

  return {
    ...body,
    key: reportKey,
    generatedBy: actor.fullName,
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Builds a report file for download.
 * @param {string} reportKey - Report key.
 * @param {string} format - 'xlsx' or 'pdf'.
 * @param {Object} query - Query parameters (filters).
 * @param {Actor} actor - User generating the report.
 * @returns {Promise<{ buffer: Buffer, contentType: string, fileName: string }>} File.
 * @throws {import('../utils/errors.js').AppError} 400 unknown format, 404 unknown report.
 */
export const exportReport = async (reportKey, format, query, actor) => {
  if (!isOneOf(format, [REPORT_FORMATS.XLSX, REPORT_FORMATS.PDF])) {
    throw createAppError('Format must be json, xlsx or pdf', 400);
  }

  const report = await getReport(reportKey, query, actor);
  const fileName = `${reportKey}-${toManilaDate()}.${format}`;

  if (format === REPORT_FORMATS.XLSX) {
    return {
      buffer: await buildExcel(report),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileName,
    };
  }

  return { buffer: await buildPdf(report), contentType: 'application/pdf', fileName };
};
