import { useEffect, useState } from 'react';
import { Alert, Button, Empty, Flex, List, Spin, Typography } from 'antd';

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../api/notifications.api.js';
import { BRAND_COLORS } from '../../utils/constants.js';
import { formatDateTime } from '../../utils/dateFormat.js';

const STYLES = {
  root: { width: 360, maxWidth: 'calc(100vw - 32px)' },
  list: { maxHeight: 420, overflowY: 'auto' },
  item: { cursor: 'pointer', paddingInline: 8, borderRadius: 8 },
  unreadItem: {
    cursor: 'pointer',
    paddingInline: 8,
    borderRadius: 8,
    background: BRAND_COLORS.blueSoft,
  },
};

/**
 * Recent in-app notifications shown in the header bell popover. Clicking one marks it read and
 * opens its link; "Mark all read" clears the unread count.
 * @param {Object} props
 * @param {(count: number) => void} props.onUnreadCountChange - Called with the new unread count.
 * @param {(link: string) => void} props.onOpenLink - Opens a notification's in-app link.
 * @returns {JSX.Element}
 */
export const NotificationList = ({ onUnreadCountChange, onOpenLink }) => {
  const [notifications, setNotifications] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let ignore = false;

    /**
     * Loads the recent notifications. Skips state updates after unmount.
     * @returns {Promise<void>}
     */
    const loadNotifications = async () => {
      try {
        const data = await listNotifications();

        if (!ignore) {
          setNotifications(data);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error.message);
        }
      }
    };

    loadNotifications();

    return () => {
      ignore = true;
    };
  }, []);

  /**
   * Updates the list and reports the new unread count.
   * @param {import('../../utils/types.js').AppNotification[]} next - Updated notifications.
   * @returns {void}
   */
  const applyNotifications = (next) => {
    setNotifications(next);
    onUnreadCountChange(next.filter((notification) => !notification.isRead).length);
  };

  /**
   * Marks a notification read and opens its link.
   * @param {import('../../utils/types.js').AppNotification} notification - Clicked notification.
   * @returns {Promise<void>}
   */
  const handleOpen = async (notification) => {
    if (!notification.isRead) {
      try {
        await markNotificationRead(notification.id);

        applyNotifications(
          notifications.map((entry) =>
            entry.id === notification.id ? { ...entry, isRead: true } : entry,
          ),
        );
      } catch (error) {
        setErrorMessage(error.message);
      }
    }

    if (notification.link) {
      onOpenLink(notification.link);
    }
  };

  /**
   * Marks every notification as read.
   * @returns {Promise<void>}
   */
  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      applyNotifications(notifications.map((entry) => ({ ...entry, isRead: true })));
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const hasUnread = Boolean(notifications?.some((notification) => !notification.isRead));

  return (
    <Flex vertical gap={8} style={STYLES.root}>
      <Flex justify="space-between" align="center">
        <Typography.Text strong>Notifications</Typography.Text>
        <Button type="link" size="small" disabled={!hasUnread} onClick={handleMarkAllRead}>
          Mark all read
        </Button>
      </Flex>
      {errorMessage && <Alert type="error" showIcon title={errorMessage} />}
      {!notifications && !errorMessage && <Spin />}
      {notifications && !notifications.length && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No notifications yet" />
      )}
      {notifications && notifications.length > 0 && (
        <List
          style={STYLES.list}
          dataSource={notifications}
          renderItem={(notification) => (
            <List.Item
              key={notification.id}
              style={notification.isRead ? STYLES.item : STYLES.unreadItem}
              onClick={() => handleOpen(notification)}
            >
              <Flex vertical gap={2}>
                <Typography.Text strong={!notification.isRead}>
                  {notification.title}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  {notification.message}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {formatDateTime(notification.createdAt)}
                </Typography.Text>
              </Flex>
            </List.Item>
          )}
        />
      )}
    </Flex>
  );
};
