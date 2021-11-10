const dotEnv = require('dotenv').config();
const os = require('os');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const https = require('https');
const forceSsl = require('express-force-ssl');
const compression = require('compression');
const pem = require('pem');
const routes = require('./routes/index');
const { certificate, globalCSP } = require('./utils/config');

const app = express();

/* server configuration */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
if (process.env.NODE_ENV === 'prod') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}
app.use(cors());
app.use(helmet());
app.use(compression());
routes.disable('x-powered-by');
app.use(globalCSP);
/** If you are in development environment comment this line * */
app.use(forceSsl);
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'ejs')

// app.use(express.static(__dirname + '/public'));
app.use(express.static(`${process.cwd()}/frontend/dashboard/dist/dashboard/`));
app.use(express.static(`${process.cwd()}/out/`));

app.use('/', routes);

if (dotEnv.error) {
  console.log(dotEnv.error);
}

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  return res.status(500).json({ ok: false, error: err.message });
});

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

if (process.env.NODE_ENV === 'dev') {
  /**  use only in case you need to do tests with https or uploads to production * */
  // if (os.platform() === 'win32') {
  //   process.env.OPENSSL_CONF = path.join(__dirname, 'certificates/openssl', 'windows', 'openssl.cnf');
  //   pem.config({
  //     pathOpenSSL: path.join(__dirname, 'certificates/openssl', 'windows', 'openssl.exe'),
  //   });
  // }
  //
  // pem.createCertificate({ days: 1, selfSigned: true }, (err, keys) => {
  //   if (err) {
  //     throw err;
  //   }
  //   https.createServer({ key: keys.serviceKey, cert: keys.certificate }, app).listen(process.env.PORT_HTTPS || 3000, () => console.log('server on port 3000'));
  // });
  app.listen(process.env.PORT_HTTP || 3001, () => console.log(`server on port ${process.env.PORT_HTTP || 3000}`));
} else {
  https.createServer(certificate, app).listen(process.env.PORT_HTTPS || 3001, () => console.log(`server on port ${process.env.PORT_HTTPS || 3001}`));
}
