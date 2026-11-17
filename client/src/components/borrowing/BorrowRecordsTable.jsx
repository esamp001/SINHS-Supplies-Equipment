import { Button, Flex, Table, Typography } from 'antd';

import { getBorrowStatusKey } from '../../utils/borrowFormat.js';
import { formatDate, formatDateTime } from '../../utils/dateFormat.js';
import { StatusTag } from '../common/StatusTag.jsx';

/**
 * Server-paginated table of borrow records.
 * @param {Object} props
 * @param {import('../../utils/types.js').BorrowRecord[]} props.records - Rows.
 * @param {import('../../utils/types.js').PageMeta} props.meta - Pagination meta.
 * @param {boolean} props.loading - Shows the loading state.
 * @param {boolean} props.showBorrower - Shows the borrower column.
 * @param {(pagination: { current: number, pageSize: number }) => void} props.onPageChange - Page or size changed.
 * @param {(recordId: number) => void} props.onOpen - Opens a record.
 * @returns {JSX.Element}
 */
export const BorrowRecordsTable = ({
  records,
  meta,
  loading,
  showBorrower,
  onPageChange,
  onOpen,
}) => {
  const columns = [
    {
      title: 'Borrow',
      key: 'record',
      width: 150,
      render: (_value, record) => (
        <Flex vertical>
          <Typography.Link strong onClick={() => onOpen(record.id)}>
            #{record.id}
          </Typography.Link>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Since {formatDate(record.borrowedAt)}
          </Typography.Text>
        </Flex>
      ),
    },
    ...(showBorrower
      ? [{ title: 'Borrower', dataIndex: 'borrowerName', key: 'borrowerName', width: 180 }]
      : []),
    { title: 'Items', dataIndex: 'itemSummary', key: 'itemSummary' },
    {
      title: 'Return by',
      dataIndex: 'dueAt',
      key: 'dueAt',
      width: 190,
      render: (value, record) => (
        <Typography.Text type={record.isOverdue ? 'danger' : undefined}>
          {formatDateTime(value)}
        </Typography.Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_value, record) => <StatusTag status={getBorrowStatusKey(record)} />,
    },
    {
      title: '',
      key: 'open',
      width: 90,
      render: (_value, record) => (
        <Button type="link" size="small" onClick={() => onOpen(record.id)}>
          Open
        </Button>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={records}
      loading={loading}
      onChange={onPageChange}
      pagination={{
        current: meta.page,
        pageSize: meta.pageSize,
        total: meta.total,
        showSizeChanger: true,
        showTotal: (total) => `${total} record(s)`,
      }}
      scroll={{ x: 900 }}
      locale={{ emptyText: 'No borrow records here' }}
    />
  );
};
