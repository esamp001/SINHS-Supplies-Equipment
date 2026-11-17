import * as notificationsRepository from '../repositories/notifications.repository.js';
import { createAppError } from '../utils/errors.js';

/** How many recent notifications the bell shows. */
const NOTIFICATION_LIST_LIMIT = 20;

/**
 * Returns the signed-in user's unread in-app notification count (for the header bell).
 * @param {number} userId - Signed-in user ID.
 * @returns {Promise<number>} Unread count.
 */
export const getUnreadCount = async (userId) => notificationsRepository.countUnread(userId);

/**
 * Lists the signed-in user's most recent notifications.
 * @param {number} userId - Signed-in user ID.
 * @returns {Promise<Array<Object>>} Notifications, newest first.
 */
export const listNotifications = async (userId) =>
  notificationsRepository.listForUser(userId, NOTIFICATION_LIST_LIMIT);

/**
 * Marks one of the signed-in user's notifications as read.
 * @param {number} userId - Signed-in user ID.
 * @param {number} notificationId - Notification ID.
 * @returns {Promise<void>}
 * @throws {import('../utils/errors.js').AppError} 404 when it doesn't exist or isn't theirs.
 */
export const markNotificationRead = async (userId, notificationId) => {
  const updated = await notificationsRepository.markRead(userId, notificationId);

  if (!updated) {
    throw createAppError('Notification not found', 404);
  }
};

/**
 * Marks all of the signed-in user's notifications as read.
 * @param {number} userId - Signed-in user ID.
 * @returns {Promise<void>}
 */
export const markAllNotificationsRead = async (userId) =>
  notificationsRepository.markAllRead(userId);
