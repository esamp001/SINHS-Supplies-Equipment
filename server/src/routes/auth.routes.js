import { Router } from 'express';

import { ENV } from '../config/env.js';
import { authenticate } from '../middlewares/auth.js';
import * as authService from '../services/auth.service.js';

/**
 * Auth routes: register, login, logout, current user, change password.
 * The session is a signed JWT in an httpOnly cookie; the token never appears in a response body.
 */
export const authRouter = Router();

/**
 * Builds the auth cookie options.
 * @param {boolean} rememberMe - Persist the cookie for JWT_EXPIRES_IN; otherwise it ends when the browser closes.
 * @returns {import('express').CookieOptions} Cookie options.
 */
const cookieOptions = (rememberMe) => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: ENV.cookieSecure,
  path: '/',
  ...(rememberMe ? { maxAge: ENV.jwtExpiresInMs } : {}),
});

authRouter.post('/register', async (req, res) => {
  const user = await authService.register(req.body || {}, req.ip);

  res.status(201).json({ success: true, data: user });
});

authRouter.post('/login', async (req, res) => {
  const body = req.body || {};
  const { user, token } = await authService.login(body, req.ip);

  res.cookie(ENV.cookieName, token, cookieOptions(body.rememberMe === true));
  res.json({ success: true, data: user });
});

authRouter.post('/logout', async (req, res) => {
  const token = req.cookies?.[ENV.cookieName];
  const userId = token ? authService.verifyToken(token) : null;

  if (userId) {
    await authService.recordLogout(userId, req.ip);
  }

  res.clearCookie(ENV.cookieName, { path: '/' });
  res.json({ success: true, data: null });
});

authRouter.get('/me', authenticate, (req, res) => {
  res.json({ success: true, data: req.user });
});

authRouter.put('/change-password', authenticate, async (req, res) => {
  const user = await authService.changePassword(req.user.id, req.body || {}, req.ip);

  res.json({ success: true, data: user });
});
