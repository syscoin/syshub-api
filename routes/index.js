const express = require('express');
const auth = require('./auth');
const user = require('./user');
const admin = require('./admin');
const masternodes = require('./masternodes');
const address = require('./address');
const proposal = require('./proposal');
const statsInfo = require('./statsAndInfo');
const faq = require('./faq');

const app = express();
const clientApp = require('../middlewares/verifyClientApp');

app.get('',
  [clientApp],
  (req, res) => res.status(200).json({ status: 'ok', api: 'Syshub' }));

app.get('/documentation', (req, res) => res.sendFile(`${process.cwd()}/out/global.html`));

app.use('/user',
  [clientApp],
  user);

app.use('/auth',
  [clientApp],
  auth);

app.use('/admin',
  [clientApp],
  admin);

app.use('/masternode',
  [clientApp],
  masternodes);

app.use('/proposal',
  [clientApp],
  proposal);

app.use('/address',
  [clientApp],
  address);

app.use('/statsInfo',
  [clientApp],
  statsInfo);

app.use('/faq',
  [clientApp],
  faq);

app.get('*', (req, res) => res.status(404).json({ ok: false, message: 'Not Found' }));

app.post('*', (req, res) => res.status(404).json({ ok: false, message: 'Not Found' }));

app.put('*', (req, res) => res.status(404).json({ ok: false, message: 'Not Found' }));

app.delete('*', (req, res) => res.status(404).json({ ok: false, message: 'Not Found' }));

module.exports = app;
