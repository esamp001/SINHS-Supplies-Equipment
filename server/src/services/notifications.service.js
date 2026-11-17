import * as notificationsRepository from '../repositories/notifications.repository.js';

/**
 * Returns the signed-in user's unread in-app notification count (for the header bell).
 * @param {number} userId - Signed-in user ID.
 * @returns {Promise<number>} Unread count.
 */
export const getUnreadCount = async (userId) => notificationsRepository.countUnread(userId);
