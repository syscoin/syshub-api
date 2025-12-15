const Joi = require('joi')

/**
 * Validation schemas for different API endpoints
 */
const schemas = {
  // Dashboard login validation
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required()
  }),

  // User actions validation
  updateUserActions: Joi.object({
    pwd: Joi.string().min(8).max(128).required(),
    twoFa: Joi.boolean().optional(),
    sms: Joi.boolean().optional(),
    gAuth: Joi.boolean().optional(),
    gAuthSecret: Joi.string().alphanum().optional(),
    code: Joi.string().length(6).pattern(/^\d+$/).optional()
  }),

  // Proposal validation
  proposal: Joi.object({
    type: Joi.number().integer().valid(0, 1).required(),
    name: Joi.string().min(1).max(40).pattern(/^[a-zA-Z0-9_-]+$/).required(),
    title: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(512).optional().allow(''),
    nPayment: Joi.number().integer().min(1).max(100).required(),
    firstEpoch: Joi.number().integer().min(0).required(),
    startEpoch: Joi.number().integer().min(0).required(),
    endEpoch: Joi.number().integer().min(0).required(),
    paymentAddress: Joi.string().min(26).max(62).required(),
    paymentAmount: Joi.number().positive().required(),
    url: Joi.string().uri().max(200).optional().allow('')
  }),

  // Hash validation
  hash: Joi.object({
    hash: Joi.string().length(64).hex().required()
  }),

  // Query hash validation (optional)
  queryHash: Joi.object({
    hash: Joi.string().length(64).hex().optional(),
    page: Joi.number().integer().min(0).max(10000).optional()
  }),

  // Pagination validation
  pagination: Joi.object({
    page: Joi.number().integer().min(0).max(10000).optional(),
    email: Joi.string().email().optional()
  }),

  // User ID validation
  userId: Joi.object({
    uid: Joi.string().required()
  })
}

/**
 * Middleware factory for request body validation
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    })

    if (error) {
      const errors = error.details.map(d => d.message)
      return res.status(400).json({
        ok: false,
        message: 'Validation failed',
        errors
      })
    }

    req.body = value // Use validated/sanitized data
    next()
  }
}

/**
 * Middleware factory for query parameter validation
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    })

    if (error) {
      const errors = error.details.map(d => d.message)
      return res.status(400).json({
        ok: false,
        message: 'Validation failed',
        errors
      })
    }

    req.query = value // Use validated/sanitized data
    next()
  }
}

/**
 * Middleware factory for parameter validation
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    })

    if (error) {
      const errors = error.details.map(d => d.message)
      return res.status(400).json({
        ok: false,
        message: 'Validation failed',
        errors
      })
    }

    req.params = value // Use validated/sanitized data
    next()
  }
}

module.exports = {
  schemas,
  validate,
  validateQuery,
  validateParams
}
