import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import { ENV } from './config/env.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { apiRouter } from './routes/index.js';

/**
 * Express application. Express 5 forwards errors from async route handlers to the error
 * handler automatically, so routes don't need an asyncHandler wrapper.
 */
export const app = express();

app.set('trust proxy', 'loopback');

app.use(
  cors({ origin: ENV.corsOrigin, credentials: true, exposedHeaders: ['Content-Disposition'] }),
);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/api/v1', apiRouter);
app.use('/api', notFound);
app.use(errorHandler);
