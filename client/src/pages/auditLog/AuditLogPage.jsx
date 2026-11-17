import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Flex,
  Row,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd';

import { getAuditLogFilters, listAuditLogs } from '../../api/auditLogs.api.js';
import { listUsers } from '../../api/users.api.js';
import { PageHero } from '../../components/common/PageHero.jsx';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants.js';
import { formatDateTime } from '../../utils/dateFormat.js';

const STYLES = {
  json: {
    margin: 0,
    padding: 12,
    maxHeight: 320,
    overflow: 'auto',
    fontSize: 12,
    background: '#F8FAFC',
    borderRadius: 8,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
};

/**
 * Turns a code like "inventory_request" into "Inventory request".
 * @param {string} value - Code.
 * @returns {string} Label.
 */
const toLabel = (value) => {
  const text = (value || '').replace(/_/g, ' ');

  return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * Before/after values of an audit entry, shown when a row is expanded.
 * @param {Object} props
 * @param {import('../../utils/types.js').AuditLogEntry} props.entry - Audit entry.
 * @returns {JSX.Element}
 */
const AuditEntryDetail = ({ entry }) => (
  <Row gutter={16}>
    <Col xs={24} md={12}>
      <Typography.Text strong>Before</Typography.Text>
      <pre style={STYLES.json}>{entry.before ? JSON.stringify(entry.before, null, 2) : '—'}</pre>
    </Col>
    <Col xs={24} md={12}>
      <Typography.Text strong>After</Typography.Text>
      <pre style={STYLES.json}>{entry.after ? JSON.stringify(entry.after, null, 2) : '—'}</pre>
    </Col>
  </Row>
);

/**
 * Audit log page (Admin only, read-only): who did what and when, with before/after values.
 * Filters: user, entity, action and date range. Entries can never be edited or deleted.
 * @returns {JSX.Element}
 */
export const AuditLogPage = () => {
  const [entries, setEntries] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [filterOptions, setFilterOptions] = useState({ users: [], actions: [], entityTypes: [] });

  const [query, setQuery] = useState({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    userId: null,
    entityType: null,
    action: null,
    dateFrom: null,
    dateTo: null,
  });

  useEffect(() => {
    let ignore = false;

    /**
     * Loads the users, actions and record types for the filter dropdowns. Skips state updates after unmount.
     * @returns {Promise<void>}
     */
    const loadFilterOptions = async () => {
      try {
        const [values, users, pendingUsers] = await Promise.all([
          getAuditLogFilters(),
          listUsers(),
          listUsers({ status: 'pending' }),
        ]);

        if (!ignore) {
          setFilterOptions({
            actions: values.actions,
            entityTypes: values.entityTypes,
            users: [...users, ...pendingUsers],
          });
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error.message);
        }
      }
    };

    loadFilterOptions();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    /**
     * Loads the current page of audit log entries. Skips state updates after unmount.
     * @returns {Promise<void>}
     */
    const loadEntries = async () => {
      try {
        const result = await listAuditLogs(query);

        if (!ignore) {
          setEntries(result.data);
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

    loadEntries();

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
  const handlePageChange = (pagination) => {
    setLoading(true);

    setQuery((current) => ({
      ...current,
      page: pagination.current,
      pageSize: pagination.pageSize,
    }));
  };

  const columns = [
    {
      title: 'When',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 190,
      render: (value) => formatDateTime(value),
    },
    {
      title: 'User',
      dataIndex: 'userName',
      key: 'userName',
      width: 190,
      render: (value) => value || 'System',
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 150,
      render: (value) => <Tag style={{ fontWeight: 600 }}>{toLabel(value)}</Tag>,
    },
    {
      title: 'Record',
      key: 'entity',
      render: (_value, entry) =>
        `${toLabel(entry.entityType)}${entry.entityId ? ` #${entry.entityId}` : ''}`,
    },
    {
      title: 'IP address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 150,
      render: (value) => value || '—',
    },
  ];

  return (
    <>
      <PageHero
        eyebrow={
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Administration / Audit log
          </Typography.Text>
        }
        title="Audit log"
        description="Every change and workflow action, with who did it, when and the values before and after. Read-only: entries can't be edited or deleted."
      />
      {errorMessage && (
        <Alert
          type="error"
          showIcon
          title="Couldn't load the audit log."
          description={errorMessage}
          action={<Button onClick={reload}>Retry</Button>}
        />
      )}
      <Card>
        <Flex vertical gap={16}>
          <Flex gap={12} wrap>
            <Select
              allowClear
              showSearch={{ optionFilterProp: 'label' }}
              aria-label="Filter by user"
              placeholder="All users"
              value={query.userId}
              onChange={(value) => updateFilter('userId', value)}
              options={filterOptions.users.map((user) => ({
                value: user.id,
                label: user.fullName,
              }))}
              style={{ width: 200 }}
            />
            <Select
              allowClear
              aria-label="Filter by record type"
              placeholder="All records"
              value={query.entityType}
              onChange={(value) => updateFilter('entityType', value)}
              options={filterOptions.entityTypes.map((value) => ({
                value,
                label: toLabel(value),
              }))}
              style={{ width: 190 }}
            />
            <Select
              allowClear
              aria-label="Filter by action"
              placeholder="All actions"
              value={query.action}
              onChange={(value) => updateFilter('action', value)}
              options={filterOptions.actions.map((value) => ({ value, label: toLabel(value) }))}
              style={{ width: 170 }}
            />
            <DatePicker.RangePicker aria-label="Date range" onChange={handleDateRangeChange} />
          </Flex>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={entries}
            loading={loading}
            onChange={handlePageChange}
            expandable={{ expandedRowRender: (entry) => <AuditEntryDetail entry={entry} /> }}
            pagination={{
              current: meta.page,
              pageSize: meta.pageSize,
              total: meta.total,
              showSizeChanger: true,
              showTotal: (total) => `${total} entr${total === 1 ? 'y' : 'ies'}`,
            }}
            scroll={{ x: 900 }}
          />
        </Flex>
      </Card>
    </>
  );
};
