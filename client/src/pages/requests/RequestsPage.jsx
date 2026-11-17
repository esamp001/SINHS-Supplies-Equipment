import { useEffect, useState } from 'react';
import { Alert, Button, Card, Flex, Input, Select, Tabs, Typography } from 'antd';

import { listRequests } from '../../api/requests.api.js';
import { PageHero } from '../../components/common/PageHero.jsx';
import { RequestDetailDrawer } from '../../components/requests/RequestDetailDrawer.jsx';
import { RequestsTable } from '../../components/requests/RequestsTable.jsx';
import {
  DEFAULT_PAGE_SIZE,
  REQUEST_STATUS,
  REQUEST_TYPE_LABELS,
  REQUEST_TYPES,
} from '../../utils/constants.js';

/** Status tabs: the review queue first. */
const STATUS_TABS = [
  { key: REQUEST_STATUS.PENDING, label: 'To review' },
  { key: REQUEST_STATUS.APPROVED, label: 'To release' },
  { key: `${REQUEST_STATUS.RELEASED},${REQUEST_STATUS.RETURNED}`, label: 'Released' },
  { key: `${REQUEST_STATUS.REJECTED},${REQUEST_STATUS.CANCELLED}`, label: 'Rejected / cancelled' },
  { key: 'all', label: 'All' },
];

const TYPE_OPTIONS = Object.values(REQUEST_TYPES).map((type) => ({
  value: type,
  label: REQUEST_TYPE_LABELS[type],
}));

/**
 * Requests page (Custodian, Admin as fallback): review queue for supply and borrow requests.
 * Approve (fully or partly), reject with a reason, and release approved items.
 * @returns {JSX.Element}
 */
export const RequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [openRequestId, setOpenRequestId] = useState(null);

  const [query, setQuery] = useState({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    status: REQUEST_STATUS.PENDING,
    requestType: null,
    search: '',
  });

  useEffect(() => {
    let ignore = false;

    /**
     * Loads the current page of requests. Skips state updates after unmount.
     * @returns {Promise<void>}
     */
    const loadRequests = async () => {
      try {
        const result = await listRequests({
          ...query,
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
            Inventory / Requests
          </Typography.Text>
        }
        title="Requests"
        description="Every supply and borrow request goes through here. Approve the full amount or less, reject with a reason, then release approved items. Nobody can approve their own request."
      />
      {errorMessage && (
        <Alert
          type="error"
          showIcon
          title="Couldn't load requests."
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
          <Flex gap={12} wrap>
            <Input.Search
              allowClear
              placeholder="Search requester, purpose or #"
              aria-label="Search requests"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onSearch={(value) => updateFilter('search', value.trim())}
              style={{ width: 280 }}
            />
            <Select
              allowClear
              aria-label="Filter by request type"
              placeholder="Supply & borrow"
              value={query.requestType}
              onChange={(value) => updateFilter('requestType', value)}
              options={TYPE_OPTIONS}
              style={{ width: 170 }}
            />
          </Flex>
          <RequestsTable
            requests={requests}
            meta={meta}
            loading={loading}
            showRequester
            onPageChange={handlePageChange}
            onOpen={setOpenRequestId}
          />
        </Flex>
      </Card>
      <RequestDetailDrawer
        requestId={openRequestId}
        canReview
        onChanged={reload}
        onClose={() => setOpenRequestId(null)}
      />
    </>
  );
};
