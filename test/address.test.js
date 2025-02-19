const request = require('./config')
const { firebase } = require('../utils/config')
const { encryptAes } = require('../utils/encrypt')

require('jest-extended')

const email = 'Enter email Firebase User'
const pwd = 'Enter pwd Firebase User'
const VotingAddressUid = 'Enter User Uid'

const getToken = () => new Promise((resolve, reject) => {
  firebase
    .auth()
    .signInWithEmailAndPassword(email, pwd)
    .then((res) => {
      resolve(encryptAes(res.user.accessToken, process.env.KEY_FOR_ENCRYPTION))
    })
    .catch((err) => {
      reject(err)
    })
})

describe('interaction with firebase', () => {
  it('all Voting Address of a user', async (done) => {
    const token = await getToken()
    request
      .get('/address/')
      .set('Content-type', 'application/json')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('appclient', 'sysnode-info')
      .then((res) => {
        if (res.statusCode === 200) {
          expect(res.statusCode).toBe(200)
          expect(res.body).toBeObject()
          expect(res.body.ok).toBeBoolean()
          expect(res.body.nodes).toBeArray()
        } else {
          expect(res.statusCode).toBe(204)
          expect(res.body).toBeObject()
          expect(res.ok).toBeBoolean()
          expect(res.nodes).toBeArray()
        }
        done()
      })
  }, 30000)

  it('get the information from a Voting Address', async (done) => {
    const token = await getToken()
    request
      .get(`/address/${VotingAddressUid}`)
      .set('Content-type', 'application/json')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('appclient', 'sysnode-info')
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(res.body.ok).toBeBoolean()
        expect(res.body.ndNode).toBeObject()
        expect(res.body.ndNode.name).toBeString()
        expect(res.body.ndNode.txId).toMatch(/-0|-1/)
        expect(res.body.ndNode.privateKey).toBeString()
        expect(res.body.ndNode.date).toBeNumber()
        expect(res.body.ndNode.address).toBeString()
        done()
      })
  }, 30000)

  it('Create Voting Address ', async (done) => {
    const token = await getToken()
    const payload = {
      name: 'Voting Test',
      address: 'tsys1qywumm0p40g0v0s53gjyyjfggy2932cagmupsyt',
      privateKey: 'cU7qnHwLNEPfyX5w3k59tqcgYCeBGBzacmwjrCMpviWLevKk3WZw',
      txId: '24143d25c63fa7f6670847101e0f3e702e44d6b6f3e2ff237666435671d19baf-0',
    }
    request
      .post('/address/')
      .set('Content-type', 'application/json')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('appclient', 'sysnode-info')
      .send(payload)
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(res.body.message).toEqual('Data saved successfully')
        done()
      })
  }, 30000)

  it('Create multiples Voting Address ', async (done) => {
    const token = await getToken()
    const payload = [
      {
        collateralHash:
          'edb941c1f19710635ded3e8293298f83dbb03d9f2cfc92b76b5bcda7ea62690b',
        collateralIndex: 0,
        collateralHeight: 543088,
        votingAddress: 'tsys1qft7wl63ppev5nryd3fck33x4gec528jx3z75gh',
        votingKey: 'cUW9A9qczkhyrRLrbDXABue14jSvPWqWBCoguoLto2sLjUeh7apW',
        label: 'votingAddress',
      },
      {
        collateralHash:
          'edb941c1f19710635ded3e8293298f83dbb03d9f2cfc92b76b5bcda7ea62690c',
        collateralIndex: 0,
        collateralHeight: 543088,
        votingAddress: 'tsys1q9vxsculf5sj27umsk4yudkpmxxtdxhtdc08zmt',
        votingKey: 'cUW9A9qczkhyrRLrbDXABue14jSvPWqWBCoguoLto2sLjUeh7apW',
        label: 'votingAddress',
      },
    ]
    request
      .post('/address/')
      .set('Content-type', 'application/json')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('appclient', 'sysnode-info')
      .send({ listMN: JSON.stringify(payload) })
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(res.body.message).toEqual('Data saved successfully')
        done()
      })
  }, 30000)

  it('Update Voting Address ', async (done) => {
    const token = await getToken()
    const payload = {
      name: 'Voting Test',
      address: 'tsys1qywumm0p40g0v0s53gjyyjfggy2932cagmupsyt',
      privateKey: 'cU7qnHwLNEPfyX5w3k59tqcgYCeBGBzacmwjrCMpviWLevKk3WZw',
      txId: '24143d25c63fa7f6670847101e0f3e702e44d6b6f3e2ff237666435671d19baf-1',
    }
    request
      .put(`/address/${VotingAddressUid}`)
      .set('Content-type', 'application/json')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('appclient', 'sysnode-info')
      .send({ data: payload })
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(res.body.ok).toBeBoolean()
        expect(res.body.message).toEqual('Voting Address Updated')
        done()
      })
  }, 30000)

  it('Delete Voting Address ', async (done) => {
    const token = await getToken()
    request
      .delete(`/address/${VotingAddressUid}`)
      .set('Content-type', 'application/json')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('appclient', 'sysnode-info')
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(res.body.ok).toBeBoolean()
        expect(res.body.message).toEqual('Voting Address Deleted')
        done()
      })
  }, 30000)
})
