import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Flex, Tabs, Typography } from 'antd';

import homeAdminUrl from '../../assets/images/homeAdmin.svg';
import { listPositions } from '../../api/lookups.api.js';
import { listUsers } from '../../api/users.api.js';
import { PageHero } from '../../components/common/PageHero.jsx';
import { USER_STATUS } from '../../utils/constants.js';
import { AllUsersTable } from './AllUsersTable.jsx';
import { PendingRegistrationsTable } from './PendingRegistrationsTable.jsx';
import { RolePermissionsTable } from './RolePermissionsTable.jsx';

const TAB_KEYS = Object.freeze({ PENDING: 'pending', USERS: 'users', MATRIX: 'matrix' });

/**
 * Users & roles page (Admin only): pending registrations, all users, role permissions.
 * Loads users and positions from the API; tables call the API and then ask this page to reload.
 * @returns {JSX.Element}
 */
export const UsersPage = () => {
  const [activeTab, setActiveTab] = useState(TAB_KEYS.PENDING);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [positionOptions, setPositionOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    Promise.all([listUsers({ status: USER_STATUS.PENDING }), listUsers(), listPositions()])
      .then(([pending, approved, positions]) => {
        if (ignore) {
          return;
        }

        setPendingUsers(pending);
        setApprovedUsers(approved);

        setPositionOptions(
          positions.map((position) => ({ value: position.id, label: position.name })),
        );

        setErrorMessage('');
      })
      .catch((error) => {
        if (!ignore) {
          setErrorMessage(error.message);
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  /**
   * Reloads users after a change (approve, reject, role, status).
   * @returns {void}
   */
  const handleReload = useCallback(() => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  const tabItems = [
    {
      key: TAB_KEYS.PENDING,
      label: (
        <Flex align="center" gap={8}>
          Pending registrations
          <Badge count={pendingUsers.length} size="small" />
        </Flex>
      ),
      children: (
        <PendingRegistrationsTable
          users={pendingUsers}
          loading={loading}
          positionOptions={positionOptions}
          onChanged={handleReload}
        />
      ),
    },
    {
      key: TAB_KEYS.USERS,
      label: 'All users',
      children: <AllUsersTable users={approvedUsers} loading={loading} onChanged={handleReload} />,
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
      {errorMessage && (
        <Alert
          type="error"
          showIcon
          title="Couldn't load users."
          description={errorMessage}
          action={<Button onClick={handleReload}>Retry</Button>}
        />
      )}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </>
  );
};
