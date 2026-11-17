import { db } from '../config/db.js';

/**
 * Inserts in-app notifications for one or more users.
 * @param {number[]} userIds - Recipient user IDs.
 * With a `dedupeKey`, a user never gets the same notification twice (used by the daily check).
 * @param {{ type: string, title: string, message: string, link?: string | null, dedupeKey?: string | null }} notification - Content.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<void>}
 */
export const createForUsers = async (userIds, notification, trx = db) => {
  const uniqueUserIds = [...new Set(userIds)];

  if (!uniqueUserIds.length) {
    return;
  }

  const query = trx('notifications').insert(
    uniqueUserIds.map((userId) => ({
      user_id: userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link || null,
      dedupe_key: notification.dedupeKey || null,
    })),
  );

  if (notification.dedupeKey) {
    query.onConflict(['user_id', 'dedupe_key']).ignore();
  }

  await query;
};

/**
 * Lists a user's newest notifications.
 * @param {number} userId - User ID.
 * @param {number} limit - Max rows.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<Array<{ id: number, type: string, title: string, message: string, link: string | null, isRead: boolean, createdAt: string }>>} Notifications.
 */
export const listForUser = async (userId, limit, trx = db) => {
  const rows = await trx('notifications')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .limit(limit)
    .select('id', 'type', 'title', 'message', 'link', 'is_read', 'created_at');

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link,
    isRead: row.is_read,
    createdAt: row.created_at,
  }));
};

/**
 * Marks one of a user's notifications as read.
 * @param {number} userId - Owner user ID.
 * @param {number} notificationId - Notification ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number>} Rows updated (0 when not found or not owned).
 */
export const markRead = async (userId, notificationId, trx = db) =>
  trx('notifications').where({ id: notificationId, user_id: userId }).update({ is_read: true });

/**
 * Marks all of a user's notifications as read.
 * @param {number} userId - Owner user ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<void>}
 */
export const markAllRead = async (userId, trx = db) => {
  await trx('notifications').where({ user_id: userId, is_read: false }).update({ is_read: true });
};

/**
 * Counts a user's unread in-app notifications.
 * @param {number} userId - User ID.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<number>} Unread count.
 */
export const countUnread = async (userId, trx = db) => {
  const row = await trx('notifications')
    .where({ user_id: userId, is_read: false })
    .count('id as count')
    .first();

  return Number(row?.count || 0);
};
