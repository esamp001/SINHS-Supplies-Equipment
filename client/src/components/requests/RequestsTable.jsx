import { Button, Flex, Table, Typography } from 'antd';

import { REQUEST_TYPE_LABELS } from '../../utils/constants.js';
import { formatDate, formatDateOnly } from '../../utils/dateFormat.js';
import { StatusTag } from '../common/StatusTag.jsx';

/**
 * Server-paginated table of inventory requests.
 * @param {Object} props
 * @param {import('../../utils/types.js').InventoryRequest[]} props.requests - Rows.
 * @param {import('../../utils/types.js').PageMeta} props.meta - Pagination meta from the API.
 * @param {boolean} props.loading - Shows the loading state.
 * @param {boolean} props.showRequester - Shows the requester column (review page).
 * @param {(pagination: { current: number, pageSize: number }) => void} props.onPageChange - Page or size changed.
 * @param {(requestId: number) => void} props.onOpen - Opens a request.
 * @returns {JSX.Element}
 */
export const RequestsTable = ({ requests, meta, loading, showRequester, onPageChange, onOpen }) => {
  const columns = [
    {
      title: 'Request',
      key: 'request',
      width: 140,
      render: (_value, request) => (
        <Flex vertical>
          <Typography.Link strong onClick={() => onOpen(request.id)}>
            #{request.id}
          </Typography.Link>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {REQUEST_TYPE_LABELS[request.requestType]} · {formatDate(request.createdAt)}
          </Typography.Text>
        </Flex>
      ),
    },
    ...(showRequester
      ? [{ title: 'Requested by', dataIndex: 'requesterName', key: 'requesterName', width: 180 }]
      : []),
    {
      title: 'Items',
      key: 'items',
      render: (_value, request) => (
        <Flex vertical>
          <span>{request.itemSummary}</span>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {request.purpose}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Needed',
      dataIndex: 'neededAt',
      key: 'neededAt',
      width: 120,
      render: (value) => formatDateOnly(value),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => <StatusTag status={status} />,
    },
    {
      title: '',
      key: 'open',
      width: 90,
      render: (_value, request) => (
        <Button type="link" size="small" onClick={() => onOpen(request.id)}>
          Open
        </Button>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={requests}
      loading={loading}
      onChange={onPageChange}
      pagination={{
        current: meta.page,
        pageSize: meta.pageSize,
        total: meta.total,
        showSizeChanger: true,
        showTotal: (total) => `${total} request(s)`,
      }}
      scroll={{ x: 900 }}
      locale={{ emptyText: 'No requests here' }}
    />
  );
};
