import { AppError } from '../utils/AppError.js';

/** PostgreSQL error codes mapped to safe API errors (AGENTS.md §7). */
const PG_ERRORS = {
  23505: { status: 409, message: 'This record already exists.' },
  23503: { status: 409, message: 'This record is linked to other data.' },
  '22P02': { status: 400, message: 'Invalid value.' },
};

/**
 * Responds 404 for unknown API routes.
 * @param {import('express').Request} req - Request.
 * @param {import('express').Response} res - Response.
 * @returns {void}
 */
export const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
};

/**
 * Global error handler: formats every error into the standard envelope.
 * Unknown errors return a generic 500; details are logged server-side only.
 * @param {Error & { statusCode?: number, errors?: Object, code?: string, type?: string }} err - Error.
 * @param {import('express').Request} req - Request.
 * @param {import('express').Response} res - Response.
 * @param {import('express').NextFunction} _next - Next (unused; required for Express to treat this as an error handler).
 * @returns {void}
 */
export const errorHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message, errors: err.errors });

    return;
  }

  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ success: false, message: 'Invalid JSON body.' });

    return;
  }

  if (PG_ERRORS[err.code]) {
    const { status, message } = PG_ERRORS[err.code];

    res.status(status).json({ success: false, message });

    return;
  }

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
};
