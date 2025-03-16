const { expect, describe, it } = require('@jest/globals')
const request = require('./config')

describe('Authenticated', () => {
  it('valid user login', async (done) => {
    const payload = {
      email: 'test@syscoin.org',
      password: '123456',
    }
    await request
      .post('/auth/login')
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .send(payload)
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.text).ok).toEqual(true)
        done()
      }, 30000)
  })

  it('Invalid user login', async (done) => {
    const payload = {
      email: 'test@gmail.com',
      password: '123456',
    }
    await request
      .post('/auth/login')
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .send(payload)
      .then((res) => {
        expect(res.statusCode).toBe(406)
        expect(JSON.parse(res.text)).toEqual({
          ok: false,
          message: 'wrong username or password',
        })
        done()
      }, 30000)
  })

  it('registered user', async (done) => {
    const payload = {
      uid: '5uLeG9jbojfOIyPvzEOaNqx2y6F3',
    }
    await request
      .post('/auth/register')
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .send(payload)
      .then((res) => {
        expect(res.statusCode).toBe(406)
        expect(JSON.parse(res.text)).toEqual({
          ok: false,
          message: 'Existing users',
        })
        done()
      }, 30000)
  })
})
