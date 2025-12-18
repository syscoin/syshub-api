const winston = require('winston')

/**
 * Logger configuration with Winston
 * Provides structured logging for security events and errors
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'syshub-api' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          let msg = `${timestamp} [${service}] ${level}: ${message}`

          // Add metadata if present
          if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`
          }

          return msg
        })
      )
    })
  ],
})

// In production, also log to files
if (process.env.NODE_ENV === 'prod') {
  // Error logs
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 5,
  }))

  // All logs
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 10485760, // 10MB
    maxFiles: 5,
  }))

  // Security events
  logger.add(new winston.transports.File({
    filename: 'logs/security.log',
    level: 'warn',
    maxsize: 10485760, // 10MB
    maxFiles: 10,
  }))
}

/**
 * Log security events with structured data
 * @param {string} event - Type of security event
 * @param {object} details - Event details
 */
const logSecurityEvent = (event, details) => {
  logger.warn('SECURITY_EVENT', {
    event,
    ...details,
    timestamp: new Date().toISOString()
  })
}

/**
 * Log authentication events
 * @param {object} details - Authentication event details
 */
const logAuthEvent = (details) => {
  logSecurityEvent('AUTHENTICATION', details)
}

/**
 * Log authorization failures
 * @param {object} details - Authorization failure details
 */
const logAuthzFailure = (details) => {
  logSecurityEvent('AUTHORIZATION_FAILURE', details)
}

/**
 * Log failed login attempts
 * @param {object} details - Failed login details
 */
const logFailedLogin = (details) => {
  logSecurityEvent('FAILED_LOGIN', details)
}

/**
 * Log 2FA events
 * @param {object} details - 2FA event details
 */
const log2FAEvent = (details) => {
  logSecurityEvent('2FA_EVENT', details)
}

/**
 * Log admin actions
 * @param {object} details - Admin action details
 */
const logAdminAction = (details) => {
  logSecurityEvent('ADMIN_ACTION', details)
}

/**
 * Log data access events
 * @param {object} details - Data access details
 */
const logDataAccess = (details) => {
  logger.info('DATA_ACCESS', details)
}

module.exports = {
  logger,
  logSecurityEvent,
  logAuthEvent,
  logAuthzFailure,
  logFailedLogin,
  log2FAEvent,
  logAdminAction,
  logDataAccess
}
