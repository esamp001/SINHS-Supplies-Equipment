import { useState } from 'react';
import { App, Button, Flex, Input, Modal, Select, Table, Typography } from 'antd';

import { approveUser, rejectUser } from '../../api/users.api.js';
import { ROLE_LABELS, ROLE_OPTIONS, ROLES } from '../../utils/constants.js';
import { formatDate } from '../../utils/dateFormat.js';

/**
 * Pending self-registrations: confirm position, choose role, then approve or reject with a reason.
 * @param {Object} props
 * @param {import('../../utils/types.js').User[]} props.users - Pending users.
 * @param {boolean} props.loading - Shows the table loading state.
 * @param {Array<{ value: number, label: string }>} props.positionOptions - Position dropdown options.
 * @param {() => void} props.onChanged - Called after an approval or rejection so the page reloads.
 * @returns {JSX.Element}
 */
export const PendingRegistrationsTable = ({ users, loading, positionOptions, onChanged }) => {
  const { message } = App.useApp();
  const [selections, setSelections] = useState({});
  const [busyUserId, setBusyUserId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  /**
   * Returns the role/position chosen for a row (defaults: staff + registered position).
   * @param {import('../../utils/types.js').User} user - Pending user.
   * @returns {{ roleCode: string, positionId: number }} Current selection.
   */
  const getSelection = (user) => ({
    roleCode: ROLES.STAFF,
    positionId: user.positionId,
    ...selections[user.id],
  });

  /**
   * Updates the role/position chosen for a row.
   * @param {number} userId - User ID.
   * @param {Object} patch - Fields to change.
   * @returns {void}
   */
  const updateSelection = (userId, patch) =>
    setSelections((current) => ({ ...current, [userId]: { ...current[userId], ...patch } }));

  /**
   * Approves a pending account with the selected role and position.
   * @param {import('../../utils/types.js').User} user - Pending user.
   * @returns {Promise<void>}
   */
  const handleApprove = async (user) => {
    const selection = getSelection(user);

    setBusyUserId(user.id);

    try {
      await approveUser(user.id, selection);
      message.success(`${user.fullName} approved as ${ROLE_LABELS[selection.roleCode]}.`);
      onChanged();
    } catch (error) {
      message.error(error.message);
    } finally {
      setBusyUserId(null);
    }
  };

  /**
   * Opens the reject dialog for a user.
   * @param {import('../../utils/types.js').User} user - Pending user.
   * @returns {void}
   */
  const openReject = (user) => {
    setRejectTarget(user);
    setRejectReason('');
    setRejectError('');
  };

  /**
   * Closes the reject dialog.
   * @returns {void}
   */
  const closeReject = () => setRejectTarget(null);

  /**
   * Rejects the selected account. A reason is required.
   * @returns {Promise<void>}
   */
  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      setRejectError('A reason is required.');

      return;
    }

    setBusyUserId(rejectTarget.id);

    try {
      await rejectUser(rejectTarget.id, rejectReason.trim());
      message.success(`${rejectTarget.fullName}'s registration was rejected.`);
      closeReject();
      onChanged();
    } catch (error) {
      setRejectError(error.message);
    } finally {
      setBusyUserId(null);
    }
  };

  /**
   * Updates the reject reason and clears its error.
   * @param {import('react').ChangeEvent<HTMLTextAreaElement>} event - Change event.
   * @returns {void}
   */
  const handleReasonChange = (event) => {
    setRejectReason(event.target.value);
    setRejectError('');
  };

  const columns = [
    {
      title: 'Person',
      key: 'person',
      render: (_value, user) => (
        <Flex vertical>
          <Typography.Text strong>{user.fullName}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {user.username} · {user.email}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Position',
      key: 'position',
      width: 210,
      render: (_value, user) => (
        <Select
          aria-label="Position"
          style={{ width: '100%' }}
          options={positionOptions}
          value={getSelection(user).positionId}
          onChange={(positionId) => updateSelection(user.id, { positionId })}
        />
      ),
    },
    {
      title: 'Role',
      key: 'role',
      width: 160,
      render: (_value, user) => (
        <Select
          aria-label="Role"
          style={{ width: '100%' }}
          options={ROLE_OPTIONS}
          value={getSelection(user).roleCode}
          onChange={(roleCode) => updateSelection(user.id, { roleCode })}
        />
      ),
    },
    {
      title: 'Registered',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (value) => formatDate(value),
    },
    {
      title: 'Decision',
      key: 'decision',
      width: 200,
      render: (_value, user) => (
        <Flex gap={8}>
          <Button
            type="primary"
            loading={busyUserId === user.id}
            onClick={() => handleApprove(user)}
          >
            Approve
          </Button>
          <Button danger disabled={busyUserId === user.id} onClick={() => openReject(user)}>
            Reject
          </Button>
        </Flex>
      ),
    },
  ];

  return (
    <>
      <Typography.Paragraph type="secondary">
        New accounts start with no role. Confirm the position, choose a role, then approve. A
        rejection needs a reason.
      </Typography.Paragraph>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={users}
        loading={loading}
        pagination={false}
        scroll={{ x: 960 }}
        locale={{ emptyText: 'No pending registrations' }}
      />
      <Modal
        title={rejectTarget ? `Reject ${rejectTarget.fullName}?` : 'Reject registration'}
        open={Boolean(rejectTarget)}
        okText="Reject"
        okButtonProps={{
          danger: true,
          loading: Boolean(rejectTarget) && busyUserId === rejectTarget.id,
        }}
        onOk={handleConfirmReject}
        onCancel={closeReject}
        destroyOnHidden
      >
        <Flex vertical gap={8}>
          <Typography.Text>Reason for rejection (required)</Typography.Text>
          <Input.TextArea
            rows={3}
            value={rejectReason}
            onChange={handleReasonChange}
            status={rejectError ? 'error' : ''}
            placeholder="e.g. Not SINHS personnel"
            aria-label="Reason for rejection"
          />
          {rejectError && <Typography.Text type="danger">{rejectError}</Typography.Text>}
        </Flex>
      </Modal>
    </>
  );
};
