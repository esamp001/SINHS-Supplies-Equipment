import { request } from './httpClient.js';

/**
 * Gets the number of unread in-app notifications for the signed-in user.
 * @returns {Promise<number>} Unread count.
 */
export const getUnreadCount = async () => {
  const { data } = await request('/notifications/unread-count');
  return data.count;
};
