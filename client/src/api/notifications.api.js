import { request } from './httpClient.js';

/**
 * Gets the signed-in user's unread in-app notification count.
 * @returns {Promise<{ count: number }>} Unread count.
 */
export const getUnreadCount = () => request('/notifications/unread-count');

/**
 * Lists the signed-in user's most recent notifications.
 * @returns {Promise<import('../utils/types.js').AppNotification[]>} Notifications, newest first.
 */
export const listNotifications = () => request('/notifications');

/**
 * Marks one notification as read.
 * @param {number} id - Notification ID.
 * @returns {Promise<null>} Nothing.
 */
export const markNotificationRead = (id) =>
  request(`/notifications/${id}/read`, { method: 'POST' });

/**
 * Marks all of the signed-in user's notifications as read.
 * @returns {Promise<null>} Nothing.
 */
export const markAllNotificationsRead = () =>
  request('/notifications/read-all', { method: 'POST' });
