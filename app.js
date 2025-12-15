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
// Body size limits (configurable via env, defaults to 10kb to prevent DoS attacks)
const bodyLimit = process.env.BODY_SIZE_LIMIT || '10kb'

app.use(bodyParser.json({
  limit: bodyLimit,
  strict: true
}))
app.use(bodyParser.urlencoded({
  extended: false,
  limit: bodyLimit
}))
if (process.env.NODE_ENV === 'prod') {
  app.use(morgan('combined'))
} else {
  app.use(morgan('dev'))
}
app.use(cors())
app.use(helmet())
app.use(compression())
routes.disable('x-powered-by')
/** If you are in development environment comment this line * */
// app.use(forceSsl);
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'ejs')

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
