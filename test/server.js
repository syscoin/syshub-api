const path = require('path');
const dotEnv = require('dotenv').config({ path: path.resolve(process.cwd(), 'test', '.env') });
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const https = require('https');
const forceSsl = require('express-force-ssl');
const routes = require('../routes/index');

const app = express();

/* server configuration */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(morgan('dev'));
app.use(cors());
app.use(helmet());
app.disable('x-powered-by');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(`${__dirname}/public`));

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

module.exports = app;
