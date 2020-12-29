const express = require('express');
const auth = require('./auth');
const user = require('./user');
const admin = require('./admin');
const masterNode = require('./masternodes');
const proposal = require('./proposal');
const app = express();
let clientApp = require('../middlewares/verifyClientApp')


app.get('',
    [clientApp],
    (req, res) => res.status(200).json({status: 'ok', api: 'Syshub'}));

// app.get('/syscoin', (req, res) => res.sendFile(process.cwd() + "/frontend/dashboard/dist/dashboard/index.html"));

app.get('/documentation', (req, res) => res.sendFile(process.cwd() + "/out/global.html"))

app.use('/user',
    [clientApp],
    user);

app.use('/auth',
    [clientApp],
    auth);

app.use('/admin',
    [clientApp],
    admin);

app.use('/proposal',
    [clientApp],
    proposal);

app.use('/masternode',
    [clientApp],
    masterNode);


app.get('*', (req, res) => res.status(404).json({ok: false, message: 'Not Found'}));

app.post('*', (req, res) => res.status(404).json({ok: false, message: 'Not Found'}));

app.put('*', (req, res) => res.status(404).json({ok: false, message: 'Not Found'}));

app.delete('*', (req, res) => res.status(404).json({ok: false, message: 'Not Found'}));

module.exports = app;