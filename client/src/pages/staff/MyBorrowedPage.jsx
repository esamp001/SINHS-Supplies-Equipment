import { useEffect, useState } from 'react';
import { Alert, Button, Card, Segmented, Typography } from 'antd';

import { listBorrowRecords } from '../../api/borrowRecords.api.js';
import { PageHero } from '../../components/common/PageHero.jsx';
import { BorrowRecordDrawer } from '../../components/borrowing/BorrowRecordDrawer.jsx';
import { BorrowRecordsTable } from '../../components/borrowing/BorrowRecordsTable.jsx';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants.js';

const STATUS_OPTIONS = [
  { value: 'borrowed', label: 'Not yet returned' },
  { value: 'returned', label: 'Returned' },
];

/**
 * My borrowed items (Staff): equipment the signed-in user has borrowed, with due dates.
 * The server only returns the user's own records.
 * @returns {JSX.Element}
 */
export const MyBorrowedPage = () => {
  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [openRecordId, setOpenRecordId] = useState(null);
  const [query, setQuery] = useState({ page: 1, pageSize: DEFAULT_PAGE_SIZE, status: 'borrowed' });

  useEffect(() => {
    let ignore = false;

    /**
     * Loads the current page of the user's borrow records. Skips state updates after unmount.
     * @returns {Promise<void>}
     */
    const loadRecords = async () => {
      try {
        const result = await listBorrowRecords(query);

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
   * Switches between unreturned and returned records.
   * @param {string} status - 'borrowed' or 'returned'.
   * @returns {void}
   */
  const handleStatusChange = (status) => {
    setLoading(true);
    setQuery((current) => ({ ...current, status, page: 1 }));
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
            Menu / My borrowed items
          </Typography.Text>
        }
        title="My borrowed items"
        description="Equipment released to you and when it must be returned. Bring items back to the property custodian on or before the return date."
      />
      {errorMessage && (
        <Alert
          type="error"
          showIcon
          title="Couldn't load your borrowed items."
          description={errorMessage}
          action={<Button onClick={reload}>Retry</Button>}
        />
      )}
      <Card>
        <Segmented
          options={STATUS_OPTIONS}
          value={query.status}
          onChange={handleStatusChange}
          style={{ marginBottom: 16 }}
        />
        <BorrowRecordsTable
          records={records}
          meta={meta}
          loading={loading}
          showBorrower={false}
          onPageChange={handlePageChange}
          onOpen={setOpenRecordId}
        />
      </Card>
      <BorrowRecordDrawer
        recordId={openRecordId}
        canManage={false}
        onChanged={reload}
        onClose={() => setOpenRecordId(null)}
      />
    </>
  );
};
