import { useState } from 'react';
import { Badge, Card, Flex, Tabs, Typography } from 'antd';

import homeAdminUrl from '../../assets/images/homeAdmin.svg';
import { PageHero } from '../../components/common/PageHero.jsx';
import { STATIC_USERS } from '../../data/staticData.js';
import { USER_STATUS } from '../../utils/constants.js';
import { AllUsersTable } from './AllUsersTable.jsx';
import { PendingRegistrationsTable } from './PendingRegistrationsTable.jsx';
import { RolePermissionsTable } from './RolePermissionsTable.jsx';

const TAB_KEYS = Object.freeze({ PENDING: 'pending', USERS: 'users', MATRIX: 'matrix' });

/**
 * Users & roles page (Admin only): pending registrations, all users, role permissions.
 * Static prototype: changes are kept in page state and reset when you leave the page.
 * @returns {JSX.Element}
 */
export const UsersPage = () => {
  const [activeTab, setActiveTab] = useState(TAB_KEYS.PENDING);
  const [users, setUsers] = useState(STATIC_USERS);

  const pendingUsers = users.filter((user) => user.status === USER_STATUS.PENDING);
  const approvedUsers = users.filter((user) =>
    [USER_STATUS.ACTIVE, USER_STATUS.DEACTIVATED].includes(user.status),
  );

  /**
   * Updates one user in page state.
   * @param {number} userId - User ID.
   * @param {Partial<import('../../utils/types.js').User>} changes - Fields to change.
   * @returns {void}
   */
  const handleUpdateUser = (userId, changes) =>
    setUsers((current) =>
      current.map((user) => (user.id === userId ? { ...user, ...changes } : user)),
    );

  const tabItems = [
    {
      key: TAB_KEYS.PENDING,
      label: (
        <Flex align="center" gap={8}>
          Pending registrations
          <Badge count={pendingUsers.length} size="small" />
        </Flex>
      ),
      children: <PendingRegistrationsTable users={pendingUsers} onUpdateUser={handleUpdateUser} />,
    },
    {
      key: TAB_KEYS.USERS,
      label: 'All users',
      children: <AllUsersTable users={approvedUsers} onUpdateUser={handleUpdateUser} />,
    },
    { key: TAB_KEYS.MATRIX, label: 'Role permissions', children: <RolePermissionsTable /> },
  ];

  return (
    <>
      <PageHero
        eyebrow={
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Administration / Users &amp; accounts
          </Typography.Text>
        }
        title="Users & roles"
        description="Approve self-registered personnel, assign roles and manage accounts. Only Admins can open this page."
        illustrationUrl={homeAdminUrl}
        illustrationWidth={240}
      />
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </>
  );
};
