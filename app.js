const dotEnv = require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const routes = require('./routes/index')
const { errorHandler, notFoundHandler } = require('./utils/errorHandler')

const app = express()

/* server configuration */
// Body size limits (configurable via env)
// - Not set: defaults to 10kb (secure)
// - Set to value (e.g., '1mb'): uses that limit
// - Set to 'false': no limit (trust Cloudflare)
const bodyLimitConfig = process.env.BODY_SIZE_LIMIT
const shouldApplyLimit = bodyLimitConfig !== 'false'
const bodyLimit = shouldApplyLimit ? (bodyLimitConfig || '10kb') : undefined

const jsonParserOptions = {
  strict: true,
  ...(shouldApplyLimit && { limit: bodyLimit })
}

const urlencodedParserOptions = {
  extended: false,
  ...(shouldApplyLimit && { limit: bodyLimit })
}

app.use(bodyParser.json(jsonParserOptions))
app.use(bodyParser.urlencoded(urlencodedParserOptions))

// Logging configuration
if (process.env.NODE_ENV === 'prod') {
  app.use(morgan('combined'))
} else {
  app.use(morgan('dev'))
}

// CORS configuration - whitelist allowed origins
// Defense-in-depth even with Cloudflare proxy
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://syshub-staging.syscoin.org',
      'https://syshub.syscoin.org',
      process.env.PROD_URL,
      process.env.TEST_URL,
      // Allow same-origin requests (no origin header)
      ...(process.env.NODE_ENV !== 'prod' ? ['http://localhost:3000', 'http://localhost:4200'] : [])
    ].filter(Boolean)

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true)

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions))

// Enhanced security headers with Helmet
app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  // Prevent clickjacking
  frameguard: {
    action: 'deny'
  },
  // HSTS - Force HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  // Prevent MIME sniffing
  noSniff: true,
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  // X-XSS-Protection
  xssFilter: true,
  // Hide X-Powered-By
  hidePoweredBy: true,
}))

// Additional security headers
app.use((req, res, next) => {
  // Permissions Policy - restrict browser features
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

  // Prevent caching of sensitive data
  if (req.path.includes('/user') || req.path.includes('/admin') || req.path.includes('/auth')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
  }

  next()
})

// HTTPS enforcement for production
// Even though Cloudflare handles this, add app-level for defense-in-depth
if (process.env.NODE_ENV === 'prod') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`)
    }
    next()
  })
}

app.use(compression())
routes.disable('x-powered-by')

// app.use(express.static(__dirname + '/public'));
app.use(express.static(`${process.cwd()}/frontend/dashboard/dist/dashboard/`))
app.use(express.static(`${process.cwd()}/out/`))

app.use('/', routes)

if (dotEnv.error) {
  console.log(dotEnv.error)
}

// Handle 404 errors
app.use(notFoundHandler)

// Global error handler - sanitizes errors and prevents information leakage
app.use(errorHandler)

/** @global
 * @function
 * @name app.listen
 * @desc Api initialization
 * @param port
 * @default 3000
 *
 * @param callback
 *
 * @return `server on port 3000 or port`
 * */

app.listen(process.env.PORT_HTTP || 3000, () => console.log(`server on port ${process.env.PORT_HTTP || 3000}`))
