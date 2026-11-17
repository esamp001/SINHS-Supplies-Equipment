import { Router } from 'express';

import { authenticate, requirePasswordChanged } from '../middlewares/auth.js';
import * as notificationsService from '../services/notifications.service.js';
import { parseIdParam } from '../utils/requestParsers.js';

/**
 * In-app notification routes for the signed-in user.
 */
export const notificationsRouter = Router();

notificationsRouter.use(authenticate, requirePasswordChanged);

notificationsRouter.get('/', async (req, res) => {
  const notifications = await notificationsService.listNotifications(req.user.id);

  res.json({ success: true, data: notifications });
});

notificationsRouter.get('/unread-count', async (req, res) => {
  const count = await notificationsService.getUnreadCount(req.user.id);

  res.json({ success: true, data: { count } });
});

notificationsRouter.post('/read-all', async (req, res) => {
  await notificationsService.markAllNotificationsRead(req.user.id);

  res.json({ success: true, data: null });
});

notificationsRouter.post('/:id/read', async (req, res) => {
  await notificationsService.markNotificationRead(req.user.id, parseIdParam(req.params.id));

  res.json({ success: true, data: null });
});
