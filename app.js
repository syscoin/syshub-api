var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');
var forceSsl = require('express-force-ssl');
// var https = require('https');
var http = require('http');

// var hskey;
// var hscert;
// var hscsr;

var prodURL = 'sysapiprod.cortesa.net';
var testURL = 'sysapidev.cortesa.net';

var serverCerts = fs.existsSync(`/etc/letsencrypt/live/${prodURL}`)
  ? `/etc/letsencrypt/live/${prodURL}`
  : `/etc/letsencrypt/live/${testURL}`;

// if (fs.existsSync(serverCerts)) {
//   hskey = fs.readFileSync(`${serverCerts}/privkey.pem`);
//   hscert = fs.readFileSync(`${serverCerts}/cert.pem`);
//   hscsr = fs.readFileSync(`${serverCerts}/chain.pem`);
//   // Do something
// } else {
//   hskey = fs.readFileSync('./certificates/private.key');
//   hscert = fs.readFileSync('./certificates/certificate.crt');
//   hscsr = fs.readFileSync('./certificates/ca_bundle.crt');
// }

// var options = {
//   key: hskey,
//   cert: hscert,
//   ca: hscsr
// };

var index = require('./routes/index');

var app = express();
// app.use(forceSsl);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// Create an HTTP service.
http.createServer(app).listen(3000);
// Create an HTTPS service identical to the HTTP service.
// https.createServer(options, app).listen(443);
