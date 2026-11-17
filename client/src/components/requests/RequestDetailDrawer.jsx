import { useEffect, useState } from 'react';
import { Alert, App, Button, Descriptions, Drawer, Flex, Spin, Table, Typography } from 'antd';

import { cancelRequest, getRequest } from '../../api/requests.api.js';
import { useAuth } from '../../hooks/useAuth.js';
import { REQUEST_STATUS, REQUEST_TYPE_LABELS, REQUEST_TYPES } from '../../utils/constants.js';
import { formatDateOnly, formatDateTime } from '../../utils/dateFormat.js';
import { StatusTag } from '../common/StatusTag.jsx';
import { ApproveRequestModal } from './ApproveRequestModal.jsx';
import { RejectRequestModal } from './RejectRequestModal.jsx';
import { ReleaseRequestModal } from './ReleaseRequestModal.jsx';

/**
 * Request detail drawer shared by the review page and "My requests".
 * Reviewers can approve, reject and release; the requester can cancel while pending.
 * Nobody can approve or reject their own request (AGENTS.md §9).
 * @param {Object} props
 * @param {number | null} props.requestId - Request to show; null hides the drawer.
 * @param {boolean} props.canReview - Whether the signed-in user may review requests.
 * @param {() => void} props.onChanged - Called after any action so the list reloads.
 * @param {() => void} props.onClose - Closes the drawer.
 * @returns {JSX.Element}
 */
export const RequestDetailDrawer = ({ requestId, canReview, onChanged, onClose }) => {
  const { message, modal } = App.useApp();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    if (!requestId) {
      return undefined;
    }

    let ignore = false;

    /**
     * Loads the request with its items. Skips state updates after unmount.
     * @returns {Promise<void>}
     */
    const loadRequest = async () => {
      try {
        const data = await getRequest(requestId);

        if (!ignore) {
          setRequest(data);
          setErrorMessage('');
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error.message);
        }
      }
    };

    loadRequest();

    return () => {
      ignore = true;
    };
  }, [requestId, reloadKey]);

  const isLoading = Boolean(requestId) && request?.id !== requestId && !errorMessage;
  const isOwn = request?.requestedBy === user.id;
  const isBorrow = request?.requestType === REQUEST_TYPES.BORROW;

  /**
   * Closes any dialog, reloads the drawer and tells the page to reload.
   * @param {string} successMessage - Message to show.
   * @returns {void}
   */
  const handleActionDone = (successMessage) => {
    message.success(successMessage);
    setDialog(null);
    setReloadKey((key) => key + 1);
    onChanged();
  };

  /**
   * Asks for confirmation, then cancels the user's own pending request.
   * @returns {void}
   */
  const confirmCancel = () => {
    modal.confirm({
      title: `Cancel request #${request.id}?`,
      content: 'The custodian will no longer see it for review.',
      okText: 'Cancel request',
      okButtonProps: { danger: true },
      cancelText: 'Keep it',
      onOk: async () => {
        try {
          await cancelRequest(request.id);
          handleActionDone('Request cancelled.');
        } catch (error) {
          message.error(error.message);
        }
      },
    });
  };

  /**
   * Builds the action buttons allowed for this request and user.
   * @returns {JSX.Element[]} Buttons.
   */
  const renderActions = () => {
    if (!request) {
      return [];
    }

    const actions = [];
    const isPending = request.status === REQUEST_STATUS.PENDING;

    if (isPending && isOwn) {
      actions.push(
        <Button key="cancel" danger onClick={confirmCancel}>
          Cancel request
        </Button>,
      );
    }

    if (isPending && canReview && !isOwn) {
      actions.push(
        <Button key="reject" danger onClick={() => setDialog('reject')}>
          Reject
        </Button>,
        <Button key="approve" type="primary" onClick={() => setDialog('approve')}>
          Approve
        </Button>,
      );
    }

    if (request.status === REQUEST_STATUS.APPROVED && canReview) {
      actions.push(
        <Button key="release" type="primary" onClick={() => setDialog('release')}>
          Release items
        </Button>,
      );
    }

    return actions;
  };

  const columns = [
    {
      title: 'Item',
      key: 'item',
      render: (_value, item) => (
        <Flex vertical>
          <Typography.Text strong>{item.itemName}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {item.itemCode}
            {canReview ? ` · ${item.quantityOnHand} ${item.unitName} in stock` : ''}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Requested',
      key: 'requested',
      width: 110,
      render: (_value, item) => `${item.requestedQuantity} ${item.unitName}`,
    },
    {
      title: 'Approved',
      dataIndex: 'approvedQuantity',
      key: 'approved',
      width: 100,
      render: (value) => value ?? '—',
    },
    {
      title: 'Released',
      dataIndex: 'releasedQuantity',
      key: 'released',
      width: 100,
      render: (value) => value ?? '—',
    },
    {
      title: 'Remark',
      dataIndex: 'remarks',
      key: 'remarks',
      render: (value) => value || '—',
    },
  ];

  return (
    <Drawer
      title={request ? `Request #${request.id}` : 'Request'}
      open={Boolean(requestId)}
      onClose={onClose}
      size={820}
      extra={<Flex gap={8}>{renderActions()}</Flex>}
    >
      {errorMessage && <Alert type="error" showIcon title={errorMessage} />}
      {isLoading && <Spin />}
      {request && !isLoading && (
        <Flex vertical gap={24}>
          {canReview && isOwn && request.status === REQUEST_STATUS.PENDING && (
            <Alert
              type="info"
              showIcon
              title="This is your own request. Another custodian or an admin must review it."
            />
          )}
          {request.status === REQUEST_STATUS.REJECTED && (
            <Alert type="error" showIcon title={`Rejected: ${request.rejectionReason}`} />
          )}
          <Descriptions
            bordered
            size="small"
            column={{ xs: 1, sm: 2 }}
            items={[
              {
                key: 'status',
                label: 'Status',
                children: <StatusTag status={request.status} />,
              },
              {
                key: 'type',
                label: 'Type',
                children: REQUEST_TYPE_LABELS[request.requestType],
              },
              { key: 'requester', label: 'Requested by', children: request.requesterName },
              {
                key: 'created',
                label: 'Submitted',
                children: formatDateTime(request.createdAt),
              },
              {
                key: 'needed',
                label: 'Needed on',
                children: formatDateOnly(request.neededAt),
              },
              ...(isBorrow
                ? [{ key: 'due', label: 'Return by', children: formatDateTime(request.dueAt) }]
                : []),
              {
                key: 'purpose',
                label: 'Purpose',
                children: request.purpose || '—',
                span: 'filled',
              },
              {
                key: 'reviewed',
                label: 'Reviewed',
                children: request.reviewerName
                  ? `${request.reviewerName} · ${formatDateTime(request.reviewedAt)}`
                  : '—',
              },
              {
                key: 'releasedAt',
                label: 'Released',
                children: request.releasedAt
                  ? `${request.releasedByName} · ${formatDateTime(request.releasedAt)}`
                  : '—',
              },
            ]}
          />
          <Table
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={request.items}
            pagination={false}
            scroll={{ x: 640 }}
          />
          {request.borrowRecordId && (
            <Typography.Text type="secondary">
              Borrow record #{request.borrowRecordId} tracks the return of these items.
            </Typography.Text>
          )}
        </Flex>
      )}
      {dialog === 'approve' && request && (
        <ApproveRequestModal
          request={request}
          onApproved={() => handleActionDone('Request approved.')}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'reject' && request && (
        <RejectRequestModal
          request={request}
          onRejected={() => handleActionDone('Request rejected.')}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'release' && request && (
        <ReleaseRequestModal
          request={request}
          onReleased={() => handleActionDone('Items released.')}
          onCancel={() => setDialog(null)}
        />
      )}
    </Drawer>
  );
};
