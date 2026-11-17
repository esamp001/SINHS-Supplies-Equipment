import { useEffect, useState } from 'react';
import { Alert, Button, Card, Flex, Segmented, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

import { listRequests } from '../../api/requests.api.js';
import { PageHero } from '../../components/common/PageHero.jsx';
import { RequestDetailDrawer } from '../../components/requests/RequestDetailDrawer.jsx';
import { RequestsTable } from '../../components/requests/RequestsTable.jsx';
import { PATHS } from '../../routes/navConfig.js';
import { DEFAULT_PAGE_SIZE, REQUEST_STATUS } from '../../utils/constants.js';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: REQUEST_STATUS.PENDING, label: 'Pending' },
  { value: REQUEST_STATUS.APPROVED, label: 'Approved' },
  { value: `${REQUEST_STATUS.RELEASED},${REQUEST_STATUS.RETURNED}`, label: 'Released' },
  { value: `${REQUEST_STATUS.REJECTED},${REQUEST_STATUS.CANCELLED}`, label: 'Closed' },
];

/**
 * My requests (Staff): the signed-in user's own supply and borrow requests. Pending requests
 * can be cancelled from the detail drawer.
 * @returns {JSX.Element}
 */
export const MyRequestsPage = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [openRequestId, setOpenRequestId] = useState(null);
  const [query, setQuery] = useState({ page: 1, pageSize: DEFAULT_PAGE_SIZE, status: 'all' });

  useEffect(() => {
    let ignore = false;

    /**
     * Loads the current page of the user's requests. Skips state updates after unmount.
     * @returns {Promise<void>}
     */
    const loadRequests = async () => {
      try {
        const result = await listRequests({
          ...query,
          mine: true,
          status: query.status === 'all' ? '' : query.status,
        });

        if (!ignore) {
          setRequests(result.data);
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

    loadRequests();

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
   * Changes the status filter.
   * @param {string} status - Status filter value.
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
            Menu / My requests
          </Typography.Text>
        }
        title="My requests"
        description="Track your supply and borrow requests. The property custodian reviews each one; you get a notification when it is approved, rejected or released."
      >
        <Flex>
          <Button type="primary" onClick={() => navigate(PATHS.AVAILABLE_ITEMS)}>
            New request
          </Button>
        </Flex>
      </PageHero>
      {errorMessage && (
        <Alert
          type="error"
          showIcon
          title="Couldn't load your requests."
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
        <RequestsTable
          requests={requests}
          meta={meta}
          loading={loading}
          showRequester={false}
          onPageChange={handlePageChange}
          onOpen={setOpenRequestId}
        />
      </Card>
      <RequestDetailDrawer
        requestId={openRequestId}
        canReview={false}
        onChanged={reload}
        onClose={() => setOpenRequestId(null)}
      />
    </>
  );
};
