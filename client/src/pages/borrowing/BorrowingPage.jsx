import { useEffect, useState } from 'react';
import { Alert, Button, Card, Flex, Input, Tabs, Typography } from 'antd';

import { listBorrowRecords } from '../../api/borrowRecords.api.js';
import { PageHero } from '../../components/common/PageHero.jsx';
import { BorrowRecordDrawer } from '../../components/borrowing/BorrowRecordDrawer.jsx';
import { BorrowRecordsTable } from '../../components/borrowing/BorrowRecordsTable.jsx';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants.js';

/** Status tabs for borrow records. */
const STATUS_TABS = [
  { key: 'borrowed', label: 'Borrowed' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'returned', label: 'Returned' },
  { key: 'all', label: 'All' },
];

/**
 * Borrowing & returns page (Custodian, Admin as fallback): equipment that is out on loan,
 * overdue items and returns. Borrowing itself starts from an approved borrow request.
 * @returns {JSX.Element}
 */
export const BorrowingPage = () => {
  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [openRecordId, setOpenRecordId] = useState(null);

  const [query, setQuery] = useState({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    status: 'borrowed',
    search: '',
  });

  useEffect(() => {
    let ignore = false;

    /**
     * Loads the current page of borrow records. Skips state updates after unmount.
     * @returns {Promise<void>}
     */
    const loadRecords = async () => {
      try {
        const result = await listBorrowRecords({
          ...query,
          status: query.status === 'all' ? '' : query.status,
        });

        if (!ignore) {
          setRecords(result.data);
          setMeta(result.meta);
          setErrorMessage('');
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadRecords();

    return () => {
      ignore = true;
    };
  }, [query, reloadKey]);

  /**
   * Reloads the current page.
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
    setQuery((current) => ({ ...current, [field]: value, page: 1 }));
  };

  /**
   * Handles table pagination changes (server-side).
   * @param {{ current: number, pageSize: number }} pagination - Pagination state.
   * @returns {void}
   */
  const handlePageChange = (pagination) => {
    setLoading(true);

    setQuery((current) => ({
      ...current,
      page: pagination.current,
      pageSize: pagination.pageSize,
    }));
  };

  return (
    <>
      <PageHero
        eyebrow={
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Inventory / Borrowing &amp; returns
          </Typography.Text>
        }
        title="Borrowing & returns"
        description="Equipment released on approved borrow requests. Record returns with each item's condition; overdue items are flagged automatically."
      />
      {errorMessage && (
        <Alert
          type="error"
          showIcon
          title="Couldn't load borrow records."
          description={errorMessage}
          action={<Button onClick={reload}>Retry</Button>}
        />
      )}
      <Card>
        <Tabs
          activeKey={query.status}
          onChange={(status) => updateFilter('status', status)}
          items={STATUS_TABS}
        />
        <Flex vertical gap={16}>
          <Input.Search
            allowClear
            placeholder="Search borrower, item or property no."
            aria-label="Search borrow records"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onSearch={(value) => updateFilter('search', value.trim())}
            style={{ maxWidth: 320 }}
          />
          <BorrowRecordsTable
            records={records}
            meta={meta}
            loading={loading}
            showBorrower
            onPageChange={handlePageChange}
            onOpen={setOpenRecordId}
          />
        </Flex>
      </Card>
      <BorrowRecordDrawer
        recordId={openRecordId}
        canManage
        onChanged={reload}
        onClose={() => setOpenRecordId(null)}
      />
    </>
  );
};
