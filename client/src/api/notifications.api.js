import { request } from './httpClient.js';

/**
 * Gets the signed-in user's unread in-app notification count.
 * @returns {Promise<{ count: number }>} Unread count.
 */
export const getUnreadCount = () => request('/notifications/unread-count');
