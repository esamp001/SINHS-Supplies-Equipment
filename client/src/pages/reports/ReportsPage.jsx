import { useEffect, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Flex,
  Segmented,
  Select,
  Table,
  Typography,
} from 'antd';
import { FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { listItemTypes } from '../../api/itemTypes.api.js';
import { listMasterData } from '../../api/masterData.api.js';
import { downloadReport, getReport } from '../../api/reports.api.js';
import { PageHero } from '../../components/common/PageHero.jsx';
import {
  ITEM_KIND_LABELS,
  ITEM_KINDS,
  REQUEST_STATUS,
  REQUEST_TYPE_LABELS,
  REQUEST_TYPES,
  STATUS_TAGS,
  TRANSACTION_TYPES,
} from '../../utils/constants.js';
import { formatDateTime } from '../../utils/dateFormat.js';

/** Reports and the filters each one supports. */
const REPORTS = [
  {
    key: 'stock-levels',
    label: 'Stock levels',
    description: 'Every item with its quantity on hand, reorder level and low-stock status.',
    filters: ['categoryId', 'itemTypeId', 'kind', 'lowStockOnly'],
  },
  {
    key: 'transactions',
    label: 'Transaction history',
    description: 'The stock ledger: stock-in, releases, adjustments, borrows and returns.',
    filters: ['dateRange', 'type'],
  },
  {
    key: 'borrowed-equipment',
    label: 'Borrowed equipment',
    description: 'Equipment out on loan, overdue items and past returns.',
    filters: ['borrowStatus'],
  },
  {
    key: 'requests',
    label: 'Requests',
    description: 'Supply and borrow requests submitted in a period, with their status.',
    filters: ['dateRange', 'requestStatus', 'requestType'],
  },
];

const KIND_OPTIONS = Object.values(ITEM_KINDS).map((kind) => ({
  value: kind,
  label: ITEM_KIND_LABELS[kind],
}));

const TYPE_OPTIONS = Object.values(TRANSACTION_TYPES).map((type) => ({
  value: type,
  label: STATUS_TAGS[type].label,
}));

const BORROW_STATUS_OPTIONS = [
  { value: 'borrowed', label: 'Not returned' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'returned', label: 'Returned' },
];

const REQUEST_STATUS_OPTIONS = Object.values(REQUEST_STATUS).map((status) => ({
  value: status,
  label: STATUS_TAGS[status].label,
}));

const REQUEST_TYPE_OPTIONS = Object.values(REQUEST_TYPES).map((type) => ({
  value: type,
  label: REQUEST_TYPE_LABELS[type],
}));

/** Empty filter values (all reports share one filter object). */
const EMPTY_FILTERS = Object.freeze({
  categoryId: null,
  itemTypeId: null,
  kind: null,
  lowStockOnly: false,
  dateFrom: null,
  dateTo: null,
  type: null,
  status: null,
  requestType: null,
});

/**
 * Reports page (Admin / Custodian): pick a report, set filters, preview it on screen and export
 * the same data to Excel or PDF (generated on the server).
 * @returns {JSX.Element}
 */
export const ReportsPage = () => {
  const { message } = App.useApp();
  const [reportKey, setReportKey] = useState(REPORTS[0].key);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [downloading, setDownloading] = useState(null);
  const [lookups, setLookups] = useState({ categories: [], itemTypes: [] });
  const reportConfig = REPORTS.find((entry) => entry.key === reportKey);

  useEffect(() => {
    let ignore = false;

    /**
     * Loads categories and item types for the report filters. Skips state updates after unmount.
     * @returns {Promise<void>}
     */
    const loadLookups = async () => {
      try {
        const categories = await listMasterData('categories');
        const itemTypes = await listItemTypes();

        if (!ignore) {
          setLookups({ categories, itemTypes });
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error.message);
        }
      }
    };

    loadLookups();

    return () => {
      ignore = true;
    };
  }, []);

  /**
   * Builds the query parameters for the current report (only its own filters).
   * @returns {Object} Query parameters.
   */
  const buildParams = () => {
    const params = {};

    if (reportConfig.filters.includes('categoryId')) {
      params.categoryId = filters.categoryId;
      params.itemTypeId = filters.itemTypeId;
      params.kind = filters.kind;
      params.lowStockOnly = filters.lowStockOnly || undefined;
    }

    if (reportConfig.filters.includes('dateRange')) {
      params.dateFrom = filters.dateFrom;
      params.dateTo = filters.dateTo;
    }

    if (reportConfig.filters.includes('type')) {
      params.type = filters.type;
    }

    if (
      reportConfig.filters.includes('borrowStatus') ||
      reportConfig.filters.includes('requestStatus')
    ) {
      params.status = filters.status;
    }

    if (reportConfig.filters.includes('requestType')) {
      params.requestType = filters.requestType;
    }

    return params;
  };

  /**
   * Changes one filter and clears the stale preview.
   * @param {keyof typeof EMPTY_FILTERS} field - Filter name.
   * @param {*} value - New value.
   * @returns {void}
   */
  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value ?? null }));
    setReport(null);
  };

  /**
   * Switches report and resets filters.
   * @param {string} key - Report key.
   * @returns {void}
   */
  const handleReportChange = (key) => {
    setReportKey(key);
    setFilters(EMPTY_FILTERS);
    setReport(null);
    setErrorMessage('');
  };

  /**
   * onChange for the date range picker.
   * @param {[import('dayjs').Dayjs, import('dayjs').Dayjs] | null} range - Selected range.
   * @returns {void}
   */
  const handleDateRangeChange = (range) => {
    setFilters((current) => ({
      ...current,
      dateFrom: range ? range[0].format('YYYY-MM-DD') : null,
      dateTo: range ? range[1].format('YYYY-MM-DD') : null,
    }));

    setReport(null);
  };

  /**
   * Loads the on-screen preview.
   * @returns {Promise<void>}
   */
  const handlePreview = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      setReport(await getReport(reportKey, buildParams()));
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Downloads the report as Excel or PDF.
   * @param {'xlsx' | 'pdf'} format - File format.
   * @returns {Promise<void>}
   */
  const handleDownload = async (format) => {
    setDownloading(format);

    try {
      await downloadReport(reportKey, format, buildParams());
    } catch (error) {
      message.error(error.message);
    } finally {
      setDownloading(null);
    }
  };

  const hasFilter = (name) => reportConfig.filters.includes(name);

  const dateRangeValue =
    filters.dateFrom && filters.dateTo ? [dayjs(filters.dateFrom), dayjs(filters.dateTo)] : null;

  return (
    <>
      <PageHero
        eyebrow={
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Inventory / Reports
          </Typography.Text>
        }
        title="Reports"
        description="Preview a report on screen, then export the same data to Excel or PDF. Exports include the school name, filters used, who generated them and when."
      />
      <Card>
        <Flex vertical gap={16}>
          <Segmented
            options={REPORTS.map((entry) => ({ value: entry.key, label: entry.label }))}
            value={reportKey}
            onChange={handleReportChange}
          />
          <Typography.Text type="secondary">{reportConfig.description}</Typography.Text>
          <Flex gap={12} wrap align="center">
            {hasFilter('categoryId') && (
              <>
                <Select
                  allowClear
                  aria-label="Category"
                  placeholder="All categories"
                  value={filters.categoryId}
                  onChange={(value) => updateFilter('categoryId', value)}
                  options={lookups.categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  }))}
                  style={{ width: 190 }}
                />
                <Select
                  allowClear
                  aria-label="Item type"
                  placeholder="All item types"
                  value={filters.itemTypeId}
                  onChange={(value) => updateFilter('itemTypeId', value)}
                  options={lookups.itemTypes.map((type) => ({ value: type.id, label: type.name }))}
                  style={{ width: 180 }}
                />
                <Select
                  allowClear
                  aria-label="Kind"
                  placeholder="Supplies & equipment"
                  value={filters.kind}
                  onChange={(value) => updateFilter('kind', value)}
                  options={KIND_OPTIONS}
                  style={{ width: 190 }}
                />
                <Checkbox
                  checked={filters.lowStockOnly}
                  onChange={(event) => updateFilter('lowStockOnly', event.target.checked)}
                >
                  Low stock only
                </Checkbox>
              </>
            )}
            {hasFilter('dateRange') && (
              <DatePicker.RangePicker
                aria-label="Date range"
                value={dateRangeValue}
                onChange={handleDateRangeChange}
              />
            )}
            {hasFilter('type') && (
              <Select
                allowClear
                aria-label="Transaction type"
                placeholder="All types"
                value={filters.type}
                onChange={(value) => updateFilter('type', value)}
                options={TYPE_OPTIONS}
                style={{ width: 170 }}
              />
            )}
            {hasFilter('borrowStatus') && (
              <Select
                allowClear
                aria-label="Borrow status"
                placeholder="All records"
                value={filters.status}
                onChange={(value) => updateFilter('status', value)}
                options={BORROW_STATUS_OPTIONS}
                style={{ width: 170 }}
              />
            )}
            {hasFilter('requestStatus') && (
              <Select
                allowClear
                aria-label="Request status"
                placeholder="All statuses"
                value={filters.status}
                onChange={(value) => updateFilter('status', value)}
                options={REQUEST_STATUS_OPTIONS}
                style={{ width: 170 }}
              />
            )}
            {hasFilter('requestType') && (
              <Select
                allowClear
                aria-label="Request type"
                placeholder="Supply & borrow"
                value={filters.requestType}
                onChange={(value) => updateFilter('requestType', value)}
                options={REQUEST_TYPE_OPTIONS}
                style={{ width: 170 }}
              />
            )}
          </Flex>
          <Flex gap={8} wrap>
            <Button type="primary" loading={loading} onClick={handlePreview}>
              Show report
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              loading={downloading === 'xlsx'}
              onClick={() => handleDownload('xlsx')}
            >
              Export Excel
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              loading={downloading === 'pdf'}
              onClick={() => handleDownload('pdf')}
            >
              Export PDF
            </Button>
          </Flex>
          {errorMessage && <Alert type="error" showIcon title={errorMessage} />}
          {report && (
            <Flex vertical gap={8}>
              <Typography.Title level={5} style={{ margin: 0 }}>
                {report.title}
              </Typography.Title>
              <Typography.Text type="secondary">
                {report.filters.length ? report.filters.join(' · ') : 'No filters'} · Generated by{' '}
                {report.generatedBy} on {formatDateTime(report.generatedAt)}
              </Typography.Text>
              <Table
                rowKey="id"
                size="small"
                columns={report.columns.map((column) => ({
                  title: column.label,
                  dataIndex: column.key,
                  key: column.key,
                }))}
                dataSource={report.rows}
                pagination={{ pageSize: 50, hideOnSinglePage: true }}
                scroll={{ x: 1000 }}
                locale={{ emptyText: 'No records match these filters' }}
              />
            </Flex>
          )}
        </Flex>
      </Card>
    </>
  );
};
