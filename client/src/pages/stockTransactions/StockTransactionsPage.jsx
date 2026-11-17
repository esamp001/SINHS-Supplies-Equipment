import { useEffect, useState } from 'react';
import { Alert, App, Button, Card, DatePicker, Flex, Input, Select, Table, Typography } from 'antd';

import { getReconciliation, listStockTransactions } from '../../api/stockTransactions.api.js';
import { PageHero } from '../../components/common/PageHero.jsx';
import { StatusTag } from '../../components/common/StatusTag.jsx';
import { StockChangeModal } from '../../components/inventory/StockChangeModal.jsx';
import { DEFAULT_PAGE_SIZE, STATUS_TAGS, TRANSACTION_TYPES } from '../../utils/constants.js';
import { formatDateTime } from '../../utils/dateFormat.js';

const TYPE_OPTIONS = Object.values(TRANSACTION_TYPES).map((type) => ({
  value: type,
  label: STATUS_TAGS[type].label,
}));

/** Labels for what caused a ledger entry. */
const REFERENCE_LABELS = Object.freeze({
  inventory_request: 'Request',
  borrow_record: 'Borrow record',
  item_unit: 'Unit',
});

/**
 * Stock transactions page (Admin / Custodian): the stock ledger with filters, stock-in and
 * adjustment dialogs, and the reconcile check (quantity on hand must equal the ledger).
 * @returns {JSX.Element}
 */
export const StockTransactionsPage = () => {
  const { message } = App.useApp();
  const [transactions, setTransactions] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [mismatches, setMismatches] = useState(null);
  const [stockMode, setStockMode] = useState(null);
  const [searchText, setSearchText] = useState('');

  const [query, setQuery] = useState({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    search: '',
    type: null,
    dateFrom: null,
    dateTo: null,
  });

  useEffect(() => {
    let ignore = false;

    Promise.all([listStockTransactions(query), getReconciliation()])
      .then(([result, reconciliation]) => {
        if (!ignore) {
          setTransactions(result.data);
          setMeta(result.meta);
          setMismatches(reconciliation);
          setErrorMessage('');
        }
      })
      .catch((error) => {
        if (!ignore) {
          setErrorMessage(error.message);
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [query, reloadKey]);

  /**
   * Reloads the ledger and reconcile check.
   * @returns {void}
   */
  const reload = () => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  /**
   * Changes one filter and goes back to page 1.
   * @param {string} field - Query field.
   * @param {*} value - New value.
   * @returns {void}
   */
  const updateFilter = (field, value) => {
    setLoading(true);
    setQuery((current) => ({ ...current, [field]: value ?? null, page: 1 }));
  };

  /**
   * onChange for the date range picker (Manila calendar dates).
   * @param {[import('dayjs').Dayjs, import('dayjs').Dayjs] | null} range - Selected range.
   * @returns {void}
   */
  const handleDateRangeChange = (range) => {
    setLoading(true);

    setQuery((current) => ({
      ...current,
      page: 1,
      dateFrom: range ? range[0].format('YYYY-MM-DD') : null,
      dateTo: range ? range[1].format('YYYY-MM-DD') : null,
    }));
  };

  /**
   * Handles table pagination changes (server-side).
   * @param {{ current: number, pageSize: number }} pagination - Pagination state.
   * @returns {void}
   */
  const handleTableChange = (pagination) => {
    setLoading(true);

    setQuery((current) => ({
      ...current,
      page: pagination.current,
      pageSize: pagination.pageSize,
    }));
  };

  /**
   * Closes the stock dialog after a successful save and reloads.
   * @returns {void}
   */
  const handleStockSaved = () => {
    message.success(stockMode === 'adjustment' ? 'Adjustment recorded.' : 'Stock-in recorded.');
    setStockMode(null);
    reload();
  };

  const columns = [
    {
      title: 'When',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (value) => formatDateTime(value),
    },
    {
      title: 'Item',
      key: 'item',
      render: (_value, entry) => (
        <Flex vertical>
          <Typography.Text strong>{entry.itemName}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {entry.itemCode}
            {entry.propertyNo ? ` · ${entry.propertyNo}` : ''}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type) => <StatusTag status={type} />,
    },
    {
      title: 'Quantity',
      key: 'quantity',
      width: 120,
      render: (_value, entry) => (
        <Typography.Text type={entry.quantity < 0 ? 'danger' : 'success'}>
          {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity} {entry.unitName}
        </Typography.Text>
      ),
    },
    {
      title: 'Reference',
      key: 'reference',
      width: 140,
      render: (_value, entry) =>
        entry.referenceType
          ? `${REFERENCE_LABELS[entry.referenceType] || entry.referenceType} #${entry.referenceId}`
          : '—',
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      render: (value) => value || '—',
    },
    { title: 'Recorded by', dataIndex: 'performedByName', key: 'performedByName', width: 170 },
  ];

  return (
    <>
      <PageHero
        eyebrow={
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Inventory / Stock transactions
          </Typography.Text>
        }
        title="Stock transactions"
        description="Every change to stock is recorded here: stock-in, adjustments, releases, borrows and returns. Releases and borrows only happen through approved requests."
      >
        <Flex gap={8} wrap>
          <Button type="primary" onClick={() => setStockMode('stockIn')}>
            Record stock-in
          </Button>
          <Button onClick={() => setStockMode('adjustment')}>Adjust stock</Button>
        </Flex>
      </PageHero>
      {errorMessage && (
        <Alert
          type="error"
          showIcon
          title="Couldn't load stock transactions."
          description={errorMessage}
          action={<Button onClick={reload}>Retry</Button>}
        />
      )}
      {mismatches && mismatches.length === 0 && (
        <Alert type="success" showIcon title="Stock matches the ledger for every item." />
      )}
      {mismatches && mismatches.length > 0 && (
        <Alert
          type="warning"
          showIcon
          title={`${mismatches.length} item(s) don't match the ledger`}
          description={mismatches
            .map(
              (item) =>
                `${item.code} ${item.name}: on hand ${item.quantityOnHand}, ledger ${item.ledgerQuantity}${
                  item.availableUnits === null ? '' : `, available units ${item.availableUnits}`
                }`,
            )
            .join(' · ')}
        />
      )}
      <Card>
        <Flex vertical gap={16}>
          <Flex gap={12} wrap>
            <Input.Search
              allowClear
              placeholder="Search item, code or property no."
              aria-label="Search transactions"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onSearch={(value) => updateFilter('search', value.trim())}
              style={{ width: 280 }}
            />
            <Select
              allowClear
              aria-label="Filter by type"
              placeholder="All types"
              value={query.type}
              onChange={(value) => updateFilter('type', value)}
              options={TYPE_OPTIONS}
              style={{ width: 170 }}
            />
            <DatePicker.RangePicker aria-label="Date range" onChange={handleDateRangeChange} />
          </Flex>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={transactions}
            loading={loading}
            onChange={handleTableChange}
            pagination={{
              current: meta.page,
              pageSize: meta.pageSize,
              total: meta.total,
              showSizeChanger: true,
              showTotal: (total) => `${total} entr${total === 1 ? 'y' : 'ies'}`,
            }}
            scroll={{ x: 1100 }}
            locale={{ emptyText: 'No stock transactions match these filters' }}
          />
        </Flex>
      </Card>
      {stockMode && (
        <StockChangeModal
          key={stockMode}
          mode={stockMode}
          onSaved={handleStockSaved}
          onCancel={() => setStockMode(null)}
        />
      )}
    </>
  );
};
