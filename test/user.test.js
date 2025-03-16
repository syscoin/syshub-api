const request = require('./config')
const { firebase } = require('../utils/config')
const { encryptAes } = require('../utils/encrypt')

require('jest-extended')

const email = 'Enter email Firebase User'
const pwd = 'Enter pwd Firebase User'
const userUid = 'Enter User Uid'

const getToken = () => new Promise((resolve, reject) => {
  firebase
    .auth()
    .signInWithEmailAndPassword(email, pwd)
    .then((res) => {
      resolve(encryptAes(res.user.xa, process.env.KEY_FOR_ENCRYPTION))
    })
    .catch((err) => {
      reject(err)
    })
})

describe('User Actions', () => {
  it('get the information of a valid user', async (done) => {
    const token = await getToken()
    await request
      .get(`/user/${userUid}`)
      .set('Content-type', 'application/json')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('appclient', 'sysnode-info')
      .then((res) => {
        expect(res.body.ok).toBe(true)
        expect(res.statusCode).toBe(200)
        expect(res.body.user).toBeObject()
        done()
      })
      .catch((err) => {
        console.log(err)
      })

    // expect(res.body).toEqual({ok: true, message: ''})
  }, 30000)

  it('user without permission', async (done) => {
    const token = await getToken()
    await request
      .get(`/user/${userUid}`)
      .set('Content-type', 'application/json')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('appclient', 'sysnode-info')
      .then((res) => {
        expect(res.body.ok).toBe(false)
        expect(res.statusCode).toBe(406)
        expect(res.body).toBeObject()
        expect(res.body).toEqual({
          ok: false,
          message: 'you do not have permissions to perform this action',
        })
        done()
      })
      .catch((err) => {
        console.log(err)
      })
  }, 30000)

  it('user information about 2fa', async (done) => {
    await request
      .get(`/user/verify2fa/${userUid}`)
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .then((res) => {
        expect(res.body.ok).toBe(true)
        expect(res.statusCode).toBe(200)
        expect(res.body).toBeObject()
        expect(res.body.user).toBeObject()
        done()
      })
  }, 30000)

  it('2fa data update of a user', async (done) => {
    const data = {
      twoFa: true,
      sms: true,
      gAuth: false,
    }
    const token = await getToken()
    await request
      .put(`/user/extend/${userUid}`)
      .set('Content-type', 'application/json')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('appclient', 'sysnode-info')
      .send({ data })
      .then((res) => {
        expect(res.body.ok).toBe(true)
        expect(res.statusCode).toBe(200)
        expect(res.body).toBeObject()
        expect(res.body.message).toEqual('Updated data')
        done()
      })
  }, 30000)

  it('update user information', async (done) => {
    const data = {
      email: 'test@gmail.com',
    }
    const token = await getToken()
    await request
      .put(`/user/${userUid}`)
      .set('Content-type', 'application/json')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('appclient', 'sysnode-info')
      .send({ data })
      .then((res) => {
        expect(res.body.ok).toBe(true)
        expect(res.statusCode).toBe(200)
        expect(res.body).toBeObject()
        expect(res.body.message).toEqual('update')
      })
    done()
  }, 30000)

  it('remove app user', async (done) => {
    const token = await getToken()
    await request
      .delete(`/user/${userUid}`)
      .set('Content-type', 'application/json')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('appclient', 'sysnode-info')
      .then((res) => {
        expect(res.body.ok).toBe(true)
        expect(res.statusCode).toBe(200)
        expect(res.body).toBeObject()
        expect(res.body.message).toEqual('delete')
        done()
      })
  }, 30000)
})
