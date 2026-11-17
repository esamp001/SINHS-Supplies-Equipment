import { download, request } from './httpClient.js';

/**
 * @typedef {'stock-levels' | 'transactions' | 'borrowed-equipment' | 'requests'} ReportKey
 */

/**
 * @typedef {Object} Report
 * @property {ReportKey} key - Report key.
 * @property {string} title - Report title.
 * @property {string[]} filters - Human-readable filter lines.
 * @property {Array<{ key: string, label: string, width: number }>} columns - Columns.
 * @property {Array<Object<string, string | number>>} rows - Display-ready rows.
 * @property {string} generatedBy - Who generated it.
 * @property {string} generatedAt - ISO timestamp.
 */

/**
 * Loads a report for on-screen preview (Admin / Custodian).
 * @param {ReportKey} reportKey - Report.
 * @param {Object} [params] - Report filters.
 * @returns {Promise<Report>} Report.
 */
export const getReport = (reportKey, params) => request(`/reports/${reportKey}`, { params });

/**
 * Downloads a report as an Excel or PDF file.
 * @param {ReportKey} reportKey - Report.
 * @param {'xlsx' | 'pdf'} format - File format.
 * @param {Object} [params] - Report filters.
 * @returns {Promise<void>}
 */
export const downloadReport = (reportKey, format, params) =>
  download(`/reports/${reportKey}`, { ...params, format }, `${reportKey}.${format}`);
