import { Router } from 'express';

import { authenticate, requirePasswordChanged } from '../middlewares/auth.js';
import * as notificationsService from '../services/notifications.service.js';

/**
 * In-app notification routes for the signed-in user.
 */
export const notificationsRouter = Router();

notificationsRouter.use(authenticate, requirePasswordChanged);

notificationsRouter.get('/unread-count', async (req, res) => {
  const count = await notificationsService.getUnreadCount(req.user.id);

  res.json({ success: true, data: { count } });
});
