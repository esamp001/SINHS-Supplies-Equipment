import { useState } from 'react';
import { Alert, App, Button, Flex, Input, Modal, Select, Table, Tag, Typography } from 'antd';

import { StatusTag } from '../../components/common/StatusTag.jsx';
import { getPositionName } from '../../data/staticData.js';
import { useAuth } from '../../hooks/useAuth.js';
import { ROLE_LABELS, ROLE_OPTIONS, USER_STATUS } from '../../utils/constants.js';
import { formatDate } from '../../utils/dateFormat.js';

/**
 * Creates a readable temporary password (prototype only; the server generates it later).
 * @returns {string} Temporary password.
 */
const generateTemporaryPassword = () => `Temp-${Math.random().toString(36).slice(2, 8)}`;

/**
 * All approved users: change role, reset password (temporary password), deactivate/reactivate.
 * @param {Object} props
 * @param {import('../../utils/types.js').User[]} props.users - Active and deactivated users.
 * @param {(userId: number, changes: Object) => void} props.onUpdateUser - Saves changes to a user.
 * @returns {JSX.Element}
 */
export const AllUsersTable = ({ users, onUpdateUser }) => {
  const { message, modal } = App.useApp();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [roleTarget, setRoleTarget] = useState(null);
  const [newRoleCode, setNewRoleCode] = useState(null);
  const [temporaryPassword, setTemporaryPassword] = useState(null);

  const searchTerm = search.trim().toLowerCase();
  const visibleUsers = users.filter(
    (user) =>
      !searchTerm ||
      user.fullName.toLowerCase().includes(searchTerm) ||
      user.username.toLowerCase().includes(searchTerm),
  );

  /**
   * Opens the change-role dialog.
   * @param {import('../../utils/types.js').User} user - Target user.
   * @returns {void}
   */
  const openChangeRole = (user) => {
    setRoleTarget(user);
    setNewRoleCode(user.roleCode);
  };

  /**
   * Closes the change-role dialog.
   * @returns {void}
   */
  const closeChangeRole = () => setRoleTarget(null);

  /**
   * Saves the new role.
   * @returns {void}
   */
  const handleSaveRole = () => {
    onUpdateUser(roleTarget.id, { roleCode: newRoleCode });
    message.success(`${roleTarget.fullName} is now ${ROLE_LABELS[newRoleCode]}.`);
    closeChangeRole();
  };

  /**
   * Asks for confirmation, then shows a temporary password for the user.
   * @param {import('../../utils/types.js').User} user - Target user.
   * @returns {void}
   */
  const confirmResetPassword = (user) => {
    modal.confirm({
      title: `Reset ${user.fullName}'s password?`,
      content:
        'A temporary password will be created. They must change it the next time they sign in.',
      okText: 'Reset password',
      onOk: () =>
        setTemporaryPassword({ fullName: user.fullName, value: generateTemporaryPassword() }),
    });
  };

  /**
   * Asks for confirmation, then deactivates or reactivates the user.
   * @param {import('../../utils/types.js').User} user - Target user.
   * @returns {void}
   */
  const confirmToggleStatus = (user) => {
    const isActive = user.status === USER_STATUS.ACTIVE;
    modal.confirm({
      title: `${isActive ? 'Deactivate' : 'Reactivate'} ${user.fullName}?`,
      content: isActive
        ? 'They will be signed out and can no longer sign in.'
        : 'They will be able to sign in again.',
      okText: isActive ? 'Deactivate' : 'Reactivate',
      okButtonProps: { danger: isActive },
      onOk: () => {
        onUpdateUser(user.id, { status: isActive ? USER_STATUS.DEACTIVATED : USER_STATUS.ACTIVE });
        message.success(`${user.fullName} ${isActive ? 'deactivated' : 'reactivated'}.`);
      },
    });
  };

  const columns = [
    {
      title: 'Person',
      key: 'person',
      render: (_value, user) => (
        <Flex vertical>
          <Typography.Text strong>{user.fullName}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {user.username} · last sign-in {formatDate(user.lastLoginAt)}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Position',
      dataIndex: 'positionId',
      key: 'positionId',
      width: 180,
      render: (positionId) => getPositionName(positionId),
    },
    {
      title: 'Role',
      dataIndex: 'roleCode',
      key: 'roleCode',
      width: 120,
      render: (roleCode) => <Tag style={{ fontWeight: 700 }}>{ROLE_LABELS[roleCode] || '—'}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => <StatusTag status={status} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 360,
      render: (_value, user) => {
        const isSelf = user.id === currentUser.id;
        return (
          <Flex gap={0}>
            <Button type="link" size="small" disabled={isSelf} onClick={() => openChangeRole(user)}>
              Change role
            </Button>
            <Button type="link" size="small" onClick={() => confirmResetPassword(user)}>
              Reset password
            </Button>
            <Button
              type="link"
              size="small"
              danger={user.status === USER_STATUS.ACTIVE}
              disabled={isSelf}
              onClick={() => confirmToggleStatus(user)}
            >
              {user.status === USER_STATUS.ACTIVE ? 'Deactivate' : 'Reactivate'}
            </Button>
          </Flex>
        );
      },
    },
  ];

  return (
    <Flex vertical gap={16}>
      {temporaryPassword && (
        <Alert
          type="info"
          showIcon
          closable={{ onClose: () => setTemporaryPassword(null) }}
          title={`Temporary password for ${temporaryPassword.fullName}`}
          description={
            <span>
              <Typography.Text code copyable>
                {temporaryPassword.value}
              </Typography.Text>{' '}
              Give this to the user. They must change it the next time they sign in.
            </span>
          }
        />
      )}
      <Input.Search
        allowClear
        placeholder="Search by name or username"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        style={{ maxWidth: 360 }}
      />
      <Table
        rowKey="id"
        columns={columns}
        dataSource={visibleUsers}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        scroll={{ x: 900 }}
      />
      <Modal
        title={roleTarget ? `Change role for ${roleTarget.fullName}` : 'Change role'}
        open={Boolean(roleTarget)}
        okText="Save role"
        okButtonProps={{ disabled: newRoleCode === roleTarget?.roleCode }}
        onOk={handleSaveRole}
        onCancel={closeChangeRole}
        destroyOnHidden
      >
        <Flex vertical gap={8}>
          <Typography.Text type="secondary">
            Roles control access. The position ({getPositionName(roleTarget?.positionId)}) stays the
            same.
          </Typography.Text>
          <Select
            options={ROLE_OPTIONS}
            value={newRoleCode}
            onChange={setNewRoleCode}
            aria-label="Role"
          />
        </Flex>
      </Modal>
    </Flex>
  );
};
