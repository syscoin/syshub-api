const request = require('./config')
const {expect, describe, it} = require("@jest/globals");

describe('Api Online', () => {
  it('initial route', async () => {
    const res = await request.get('/').set('appclient', 'sysnode-info')
    expect(res.statusCode).toEqual(200)
    expect(res.body).toEqual({status: 'ok', api: 'Syshub'})
  });
})

describe('Api routes not found', () => {
  it('get path not achieved', async () => {
    const res = await request.get('/nofound').set('appclient', 'sysnode-info')
    expect(res.statusCode).toEqual(404)
    expect(res.body).toEqual({ok: false, message: 'Not Found'})
  });

  it('post path not achieved', async () => {
    const res = await request.post('/nofound').set('appclient', 'sysnode-info')
    expect(res.statusCode).toEqual(404)
    expect(res.body).toEqual({ok: false, message: 'Not Found'})
  });

  it('put path not achieved', async () => {
    const res = await request.put('/nofound').set('appclient', 'sysnode-info')
    expect(res.statusCode).toEqual(404)
    expect(res.body).toEqual({ok: false, message: 'Not Found'})
  });

  it('delete path not achieved', async () => {
    const res = await request.delete('/nofound').set('appclient', 'sysnode-info')
    expect(res.statusCode).toEqual(404)
    expect(res.body).toEqual({ok: false, message: 'Not Found'})
  });
})
