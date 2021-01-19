const supertest = require('supertest');
const app = require('./server');

const request = supertest(app);

module.exports = request;
