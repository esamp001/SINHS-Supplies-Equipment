import { db } from '../config/db.js';

/**
 * Inserts in-app notifications for one or more users.
 * @param {number[]} userIds - Recipient user IDs.
 * @param {{ type: string, title: string, message: string, link?: string | null }} notification - Content.
 * @param {import('knex').Knex} [trx=db] - Knex instance or transaction.
 * @returns {Promise<void>}
 */
export const createForUsers = async (userIds, notification, trx = db) => {
  if (!userIds.length) {
    return;
  }

  await trx('notifications').insert(
    userIds.map((userId) => ({
      user_id: userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link || null,
    })),
  );
};
