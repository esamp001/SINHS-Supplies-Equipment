import { useEffect, useState } from 'react';
import { Alert, App, Button, Descriptions, Drawer, Flex, Spin, Table, Typography } from 'antd';

import { getBorrowRecord } from '../../api/borrowRecords.api.js';
import { getBorrowStatusKey } from '../../utils/borrowFormat.js';
import { formatDateTime } from '../../utils/dateFormat.js';
import { StatusTag } from '../common/StatusTag.jsx';
import { ReturnItemsModal } from './ReturnItemsModal.jsx';

/**
 * Borrow record detail drawer: who borrowed what, due date and each item's return condition.
 * Custodians and admins can record returns from here.
 * @param {Object} props
 * @param {number | null} props.recordId - Record to show; null hides the drawer.
 * @param {boolean} props.canManage - Whether the user may record returns.
 * @param {() => void} props.onChanged - Called after a return so the list reloads.
 * @param {() => void} props.onClose - Closes the drawer.
 * @returns {JSX.Element}
 */
export const BorrowRecordDrawer = ({ recordId, canManage, onChanged, onClose }) => {
  const { message } = App.useApp();
  const [record, setRecord] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    if (!recordId) {
      return undefined;
    }

    let ignore = false;

    getBorrowRecord(recordId)
      .then((data) => {
        if (!ignore) {
          setRecord(data);
          setErrorMessage('');
        }
      })
      .catch((error) => {
        if (!ignore) {
          setErrorMessage(error.message);
        }
      });

    return () => {
      ignore = true;
    };
  }, [recordId, reloadKey]);

  const isLoading = Boolean(recordId) && record?.id !== recordId && !errorMessage;

  /**
   * Closes the return dialog and reloads after a successful return.
   * @returns {void}
   */
  const handleReturned = () => {
    message.success('Return recorded.');
    setIsReturning(false);
    setReloadKey((key) => key + 1);
    onChanged();
  };

  const columns = [
    {
      title: 'Item',
      key: 'item',
      render: (_value, item) => (
        <Flex vertical>
          <Typography.Text strong>{item.itemName}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {item.propertyNo || `${item.quantity} ${item.unitName}`}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Returned',
      dataIndex: 'returnedAt',
      key: 'returnedAt',
      width: 180,
      render: (value) => (value ? formatDateTime(value) : 'Not yet'),
    },
    {
      title: 'Condition',
      dataIndex: 'returnCondition',
      key: 'returnCondition',
      width: 120,
      render: (value) => (value ? <StatusTag status={value} /> : '—'),
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      render: (value) => value || '—',
    },
  ];

  return (
    <Drawer
      title={record ? `Borrow #${record.id}` : 'Borrow record'}
      open={Boolean(recordId)}
      onClose={onClose}
      size={760}
      extra={
        canManage &&
        record?.status === 'borrowed' && (
          <Button type="primary" onClick={() => setIsReturning(true)}>
            Record return
          </Button>
        )
      }
    >
      {errorMessage && <Alert type="error" showIcon title={errorMessage} />}
      {isLoading && <Spin />}
      {record && !isLoading && (
        <Flex vertical gap={24}>
          {record.isOverdue && (
            <Alert type="error" showIcon title="Overdue: the return date has passed." />
          )}
          <Descriptions
            bordered
            size="small"
            column={{ xs: 1, sm: 2 }}
            items={[
              {
                key: 'status',
                label: 'Status',
                children: <StatusTag status={getBorrowStatusKey(record)} />,
              },
              { key: 'request', label: 'Request', children: `#${record.requestId}` },
              { key: 'borrower', label: 'Borrower', children: record.borrowerName },
              { key: 'issuedBy', label: 'Released by', children: record.issuedByName || '—' },
              { key: 'borrowed', label: 'Borrowed', children: formatDateTime(record.borrowedAt) },
              { key: 'due', label: 'Return by', children: formatDateTime(record.dueAt) },
              {
                key: 'returned',
                label: 'Fully returned',
                children: record.returnedAt ? formatDateTime(record.returnedAt) : '—',
              },
              { key: 'receivedBy', label: 'Received by', children: record.receivedByName || '—' },
            ]}
          />
          <Table
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={record.items}
            pagination={false}
            scroll={{ x: 600 }}
          />
        </Flex>
      )}
      {isReturning && record && (
        <ReturnItemsModal
          record={record}
          onReturned={handleReturned}
          onCancel={() => setIsReturning(false)}
        />
      )}
    </Drawer>
  );
};
