import { useEffect, useState } from 'react';
import { Badge, Button, Flex, Grid, Layout, Popover } from 'antd';
import { BellOutlined, MenuOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { getUnreadCount } from '../../api/notifications.api.js';
import { BrandMark } from '../common/BrandMark.jsx';
import { NotificationList } from './NotificationList.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { PATHS } from '../../routes/navConfig.js';
import { NOTIFICATION_POLL_MS, ROLE_LABELS } from '../../utils/constants.js';

const STYLES = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    color: '#FFFFFF',
  },
  button: {
    color: '#FFFFFF',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    background: 'transparent',
  },
  user: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.3 },
  userName: { fontSize: 14 },
  userMeta: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)' },
};

/**
 * Top bar: brand, notification bell (unread count + recent list), user name/position/role, log out.
 * @param {Object} props
 * @param {() => void} props.onToggleNav - Toggles the side navigation (small screens).
 * @returns {JSX.Element}
 */
export const AppHeader = ({ onToggleNav }) => {
  const { user, signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isWide = Boolean(screens.md);

  useEffect(() => {
    let ignore = false;

    /**
     * Loads the unread notification count (errors keep the last known count).
     * @returns {Promise<void>}
     */
    const loadUnreadCount = async () => {
      try {
        const data = await getUnreadCount();

        if (!ignore) {
          setUnreadCount(data.count);
        }
      } catch {
        // Keep showing the last known count; the next poll tries again.
      }
    };

    loadUnreadCount();
    const timerId = setInterval(loadUnreadCount, NOTIFICATION_POLL_MS);

    return () => {
      ignore = true;
      clearInterval(timerId);
    };
  }, []);

  /**
   * Closes the notification popover and opens a notification's in-app link.
   * @param {string} link - In-app path.
   * @returns {void}
   */
  const handleOpenNotificationLink = (link) => {
    setIsNotificationsOpen(false);
    navigate(link);
  };

  /**
   * Signs out and returns to the login page.
   * @returns {Promise<void>}
   */
  const handleLogout = async () => {
    await signOut();
    navigate(PATHS.LOGIN, { replace: true });
  };

  return (
    <Layout.Header style={STYLES.header}>
      <Flex align="center" gap={12}>
        <Button
          type="text"
          icon={<MenuOutlined />}
          aria-label="Toggle navigation"
          onClick={onToggleNav}
          style={{ color: '#FFFFFF' }}
        />
        <BrandMark size="small" tagline={isWide ? 'Supplies & Equipment' : ''} />
      </Flex>
      <Flex align="center" gap={isWide ? 16 : 8}>
        <Badge count={unreadCount} size="small" color="#E8B71A" style={{ color: '#0F172A' }}>
          <Popover
            trigger="click"
            placement="bottomRight"
            open={isNotificationsOpen}
            onOpenChange={setIsNotificationsOpen}
            destroyOnHidden
            content={
              <NotificationList
                onUnreadCountChange={setUnreadCount}
                onOpenLink={handleOpenNotificationLink}
              />
            }
          >
            <Button
              icon={<BellOutlined />}
              aria-label={`Notifications, ${unreadCount} unread`}
              style={STYLES.button}
            />
          </Popover>
        </Badge>
        {isWide && (
          <div style={STYLES.user}>
            <strong style={STYLES.userName}>{user.fullName}</strong>
            <span style={STYLES.userMeta}>
              {user.positionName} · {ROLE_LABELS[user.roleCode]}
            </span>
          </div>
        )}
        <Button onClick={handleLogout} style={STYLES.button}>
          Log out
        </Button>
      </Flex>
    </Layout.Header>
  );
};
