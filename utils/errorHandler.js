/**
 * Custom application error class for operational errors
 */
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'
    Error.captureStackTrace(this, this.constructor)
  }
}

const { logger } = require('./logger')

/**
 * Error handler middleware for Express
 * Sanitizes errors and prevents leaking internal details to clients
 */
const errorHandler = (err, req, res, next) => {
  // Log full error details using Winston logger
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user || 'anonymous',
    timestamp: new Date().toISOString()
  })

  // Default to 500 server error
  let statusCode = err.statusCode || 500
  let message = err.message

  // Sanitize errors for production
  if (process.env.NODE_ENV === 'prod') {
    // Don't expose internal errors to clients
    if (!err.isOperational || statusCode >= 500) {
      message = 'An internal error occurred'
    }
  }

  // Handle specific error types

  // Firebase errors
  if (err.code && err.code.startsWith('auth/')) {
    statusCode = 401
    message = 'Authentication failed'
  }

  // Firestore errors
  if (err.code === 'permission-denied') {
    statusCode = 403
    message = 'Access denied'
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Invalid token'
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token expired'
  }

  // Validation errors (from Joi)
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = 'Validation failed'
  }

  // Send sanitized error to client
  const response = {
    ok: false,
    message
  }

  // Include stack trace only in development
  if (process.env.NODE_ENV !== 'prod') {
    response.stack = err.stack
    response.error = err.message
  }

  res.status(statusCode).json(response)
}

/**
 * Handler for 404 Not Found errors
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404)
  next(error)
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  catchAsync
}
