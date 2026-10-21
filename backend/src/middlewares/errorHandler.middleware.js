import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, req, res, _next) {
  let statusCode = err instanceof ApiError ? err.statusCode : err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err instanceof ApiError ? err.details : undefined;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    details = Object.fromEntries(
      Object.entries(err.errors || {}).map(([key, value]) => [key, value.message])
    );
    message = 'Validation failed';
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `${field} already exists` : 'Duplicate value';
  }

  // A file upload over the size limit (multer)
  if (err.name === 'MulterError') {
    statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'That image is too large — the limit is 8 MB' : 'The upload could not be read';
  }

  // Mongoose cast error (bad ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  }

  if (statusCode >= 500) {
    logger.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(env.isProd ? {} : { stack: err.stack }),
  });
}
