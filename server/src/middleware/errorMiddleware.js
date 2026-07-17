import { env } from '../config/env.js';

export function notFound(req, _res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorMiddleware(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;

  // Always log errors server-side so we can debug
  if (statusCode >= 500) {
    console.error('[ERROR]', statusCode, error.message, error.details || '');
    console.error(error.stack);
  }

  const response = {
    // In development show full message; in production hide 500 internals
    message: (statusCode === 500 && env.nodeEnv !== 'development')
      ? 'Something went wrong'
      : error.message,
  };

  if (error.details) response.details = error.details;
  if (env.nodeEnv === 'development') response.stack = error.stack;

  res.status(statusCode).json(response);
}

