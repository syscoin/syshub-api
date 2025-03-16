const request = require('./config')
const { firebase } = require('../utils/config')
const { encryptAes } = require('../utils/encrypt')

require('jest-extended')

const email = 'email firebase User'
const pwd = 'Pwd firebase User'
const proposalUid = 'Enter proposal Uid'
const proposalHiddenUid = 'Enter Proposal Hidden Uid'
const dataHex = 'Enter Proposal DataHex'
const Hash = 'Enter Proposal Hash'
const TxId = 'Enter Proposal TxId'

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

describe('interaction with rpc', () => {
  it('check the data for the execution of creation of a proposal', async (done) => {
    const token = await getToken()
    const today = new Date()
    const payload = {
      type: 1,
      name: 'test',
      title: 'test',
      description: 'no description',
      nPayment: 1,
      firstEpoch: new Date().getTime(),
      startEpoch: new Date().getTime(),
      endEpoch: today.setDate(today.getDate() + 30),
      paymentAddress: 'sys1qhthrwpu7pyw5yamc7z3akzlx6g5uwngu57wruw',
      paymentAmount: 50000,
      url: 'empty',
    }
    request
      .post('/proposal/check')
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(res.body.ok).toBeBoolean()
        expect(res.body.message).toEqual('Proposal OK')
        done()
      })
  }, 30000)

  it('preparation of a proposal', async (done) => {
    const token = await getToken()
    const today = new Date()
    const payload = {
      type: 1,
      name: 'test',
      title: 'test',
      description: 'no description',
      nPayment: 1,
      firstEpoch: new Date().getTime(),
      startEpoch: new Date().getTime(),
      endEpoch: today.setDate(today.getDate() + 30),
      paymentAddress: 'sys1qhthrwpu7pyw5yamc7z3akzlx6g5uwngu57wruw',
      paymentAmount: 50000,
      url: 'empty',
    }
    request
      .post('/proposal/prepare')
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .then((res) => {
        console.log(res.body)
        expect(res.statusCode).toBe(200)
        expect(res.body.ok).toBeBoolean()
        expect(res.body.command).toBeString()
        expect(res.body.uid).toBeString()
        done()
      })
  }, 30000)

  it('submit of a proposal ', async (done) => {
    const token = await getToken()
    const today = new Date()
    const payload = {
      parentHash: 0,
      revision: 1,
      time: today.getTime(),
      dataHex,
      txId: TxId,
    }

    request
      .put(`/proposal/submit/${proposalUid}`)
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(res.body.ok).toBeBoolean()
        expect(res.body.commandSubmit).toBeString()
        done()
      })
  }, 30000)

  it('vote in proposal ', async (done) => {
    const token = await getToken()
    const payload = {
      txHash: Hash,
      txIndex: 'Enter txIndex "1 or 0"',
      governanceHash: 'Enter GovernanceHash',
      signal: 'Enter signal -> funding',
      vote: 'Enter Vote 0,1,2',
      time: 'Enter Epoch',
      signature: 'Enter signature from the wallet',
    }

    request
      .post('/proposal/vote')
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .then((res) => {
        console.log(res.body)
        expect(res.statusCode).toBe(200)
        done()
      })
  })
})

describe('interaction with firebase', () => {
  it('incomplete proposals from a user ', async (done) => {
    const token = await getToken()
    request
      .get('/proposal/pending/recover')
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .set('Authorization', `Bearer ${accessToken}`)
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(res.body.ok).toBeBoolean()
        expect(res.body.proposal).toBeObject()
        done()
      })
  }, 30000)

  it('get the information of a proposal', async (done) => {
    const token = await getToken()
    request
      .get(`/proposal/${proposalUid}`)
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .set('Authorization', `Bearer ${accessToken}`)
      .then((res) => {
        expect(res.statusCode).toBe(200)
        if (res.body.proposal.hash) expect(res.body.proposal.hash.length).toBe(64)
        if (res.body.proposal.txId) expect(res.body.proposal.txId.length).toBe(64)
        if (res.body.proposal.prepareCommand) expect(res.body.proposal.prepareCommand).toBeString()
        if (res.body.proposal.commandSubmit) expect(res.body.proposal.commandSubmit).toBeString()
        expect(res.body.proposal.name).toBeString()
        expect(res.body.proposal.url).toBeString()
        expect(res.body.proposal.description).toBeString()
        expect(res.body.proposal.title).toBeString()
        done()
      })
  }, 30000)

  it('update a proposal', async (done) => {
    const token = await getToken()
    request
      .put(`/proposal/${proposalUid}`)
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ data: { complete: true } })
      .then((res) => {
        expect(res.body.ok).toBeBoolean()
        expect(res.statusCode).toBe(200)
        if (res.body.proposal.hash) expect(res.body.proposal.hash.length).toBe(64)
        if (res.body.proposal.txId) expect(res.body.proposal.txId.length).toBe(64)
        if (res.body.proposal.prepareCommand) expect(res.body.proposal.prepareCommand).toBeString()
        if (res.body.proposal.commandSubmit) expect(res.body.proposal.commandSubmit).toBeString()
        if (res.body.proposal.prepareObjectProposal) {
          expect(res.body.proposal.prepareObjectProposal).toBeObject()
          expect(res.body.proposal.prepareObjectProposal.dataHex).toBeString()
          expect(res.body.proposal.prepareObjectProposal.parentHash).toEqual(
            '0',
          )
          expect(res.body.proposal.prepareObjectProposal.revision).toEqual('1')
          expect(res.body.proposal.prepareObjectProposal.time).toBeString()
        }
        expect(res.body.proposal.name).toBeString()
        expect(res.body.proposal.url).toBeString()
        expect(res.body.proposal.description).toBeString()
        expect(res.body.proposal.title).toBeString()
        expect(res.body.proposal.payment_amount).toBeString()
        expect(res.body.proposal.first_epoch).toBeString()
        expect(res.body.proposal.start_epoch).toBeString()
        expect(res.body.proposal.end_epoch).toBeString()
        expect(res.body.proposal.nPayment).toBeString()
        expect(res.body.proposal.payment_address).toBeString()
        done()
      })
  }, 30000)

  it('delete a proposal', async (done) => {
    const token = await getToken()
    request
      .delete(`/proposal/${proposalUid}`)
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .set('Authorization', `Bearer ${accessToken}`)
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(res.body.ok).toBeBoolean()
        expect(res.body.message).toEqual('Proposal Removed')
        done()
      })
  }, 30000)

  it('get all proposalHidden ', async (done) => {
    request
      .get('/proposal/hiddenproposal/all')
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(res.body.ok).toBeBoolean()
        expect(res.body.hashs).toBeArray()
        done()
      })
  })

  it('create proposalHidden ', async (done) => {
    // be careful delete after create
    const payload = {
      hash: 'hashProposalTest',
    }
    request
      .post('/proposal/hiddenproposal/')
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .send(payload)
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(res.body.ok).toBeBoolean()
        expect(res.body.message).toEqual('hash created')
        done()
      })
  }, 30000)

  it('deleteProposalHidden ', async (done) => {
    request
      .delete(`/proposal/hiddenproposal/${proposalHiddenUid}`)
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(res.body.ok).toBeBoolean()
        expect(res.body.message).toEqual('hash removed')
        done()
      })
  }, 30000)
})
