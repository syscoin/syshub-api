const dotEnv = require('dotenv').config();
const os = require('os');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const https = require('https');
// const forceSsl = require('express-force-ssl');
const compression = require('compression');
const pem = require('pem');
const routes = require('./routes/index');
const { globalCSP } = require('./utils/config');
const greenlock = require("greenlock-express");
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
// app.use(forceSsl);
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

app.listen(process.env.PORT_HTTP || 3000);
greenlock.init({
  packageRoot: __dirname,
  configDir: "./greenlock.d",

  // contact for security and critical bug notices
  maintainerEmail: "thaymerapv@gmail.com",

  // whether or not to run at cloudscale
  cluster: false
}).serve(app)
