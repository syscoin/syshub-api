const request = require('./config');
const {expect, describe, it} = require("@jest/globals");
const masterNodes = require('../routes/masternodes')
const {encryptAes} = require("../utils/encrypt");
const {firebase} = require('../utils/config')

require('jest-extended');

let email = 'email firebase User'
let pwd = 'Pwd firebase User'
const masterNodeUid = 'Enter MasterNode Uid'

const getToken = () => {
  return new Promise((resolve, reject) => {
    firebase.auth().signInWithEmailAndPassword(email, pwd)
      .then(res => {
        resolve(encryptAes(res.user.xa, process.env.KEY_FOR_ENCRYPTION))
      })
      .catch(err => {
        reject(err)
      })
  })
}

describe('interaction with rpc', () => {

  it('number of masternodes', async done => {
    await request
      .get(`/masternode/count`)
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .then(res => {
        expect(res.body).toBeObject();
        expect(res.body.total).toBeNumber();
        expect(res.body.enabled).toBeNumber();
        expect(res.body.qualify).toBeNumber();
        expect(res.statusCode).toBe(200);
        done()
      })
  }, 30000);

  it('list of active proposals', async done => {
    await request
      .get(`/masternode/list`)
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body).toBeArray();
        done()
      })
  }, 30000);

  it('object containing various state info regarding blockchain processing', async done => {
    await request
      .get(`/masternode/getinfo`)
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.chain).toBeString()
        expect(res.body.blocks).toBeNumber()
        expect(res.body.headers).toBeNumber()
        expect(res.body.headers).toBeNumber()
        expect(res.body.bestblockhash.length).toBe(64)
        expect(res.body.difficulty).toBeNumber()
        expect(res.body.mediantime).toBeNumber()
        expect(res.body.verificationprogress).toBeWithin(0, 1)
        expect(res.body.initialblockdownload).toBeBoolean()
        expect(res.body.chainwork).toBeString()
        expect(res.body.size_on_disk).toBeNumber()
        expect(res.body.pruned).toBeBoolean()
        expect(res.body.pruneheight).toBeNumber()
        expect(res.body.automatic_pruning).toBeBoolean()
        expect(res.body.geth_sync_status).toBeString()
        expect(res.body.geth_total_blocks).toBeNumber()
        expect(res.body.geth_current_block).toBeNumber()
        expect(res.body.softforks).toBeObject()
        expect(res.body.warnings).toBeString()
        done()
      })
  }, 30000)

  it('object containing mining-related information', async done => {
    await request
      .get(`/masternode/getmininginfo`)
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body).toBeObject()
        expect(res.body.blocks).toBeNumber()
        expect(res.body.difficulty).toBeNumber()
        expect(res.body.networkhashps).toBeNumber()
        expect(res.body.pooledtx).toBeNumber()
        expect(res.body.chain).toBeString()
        expect(res.body.warnings).toBeString()
        done()
      })
  }, 30000);

  it('object containing governance parameters', async done => {
    await request
      .get(`/masternode/getgovernanceinfo`)
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body).toBeObject()
        expect(res.body.governanceminquorum).toBeNumber()
        expect(res.body.masternodewatchdogmaxseconds).toBeNumber()
        expect(res.body.sentinelpingmaxseconds).toBeNumber()
        expect(res.body.proposalfee).toBeNumber()
        expect(res.body.superblockcycle).toBeNumber()
        expect(res.body.lastsuperblock).toBeNumber()
        expect(res.body.nextsuperblock).toBeNumber()
        expect(res.body.maxgovobjdatasize).toBeNumber()
        done()
      })
  }, 30000);

  it('absolute maximum sum of superblock payments allowed', async done => {
    await request
      .get(`/masternode/getsuperblockbudget`)
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.lbs).toBeObject()
        expect(res.body.lbs.block).toBeNumber()
        expect(res.body.lbs.budget).toBeString()
        expect(res.body.nbs).toBeObject()
        expect(res.body.nbs.block).toBeNumber()
        expect(res.body.nbs.budget).toBeString()
        done()
      })
  });
})


describe('interaction with firebase', () => {

  it('all masternodes of a user', async done => {
    let token = await getToken();
    await request
      .get(`/masternode/`)
      .set('Content-type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .set('appclient', 'sysnode-info')
      .then(res => {
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
  }, 30000);

  it('get the information from a masternode', async done => {
    let token = await getToken();
    await request
      .get(`/masternode/${masterNodeUid}`)
      .set('Content-type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .set('appclient', 'sysnode-info')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.ok).toBeBoolean()
        expect(res.body.ndNode).toBeObject()
        expect(res.body.ndNode.name).toBeString()
        expect(res.body.ndNode.txId).toMatch(/-0|-1/)
        expect(res.body.ndNode.privateKey).toBeString()
        expect(res.body.ndNode.date).toBeNumber()
        done()
      })
  }, 30000);

  it('Create MasterNode ', async done => {
    let token = await getToken();
    let payload = {
      name: '188.40.184.65:8369',
      txId: '875df36de0d49bc130d50c81fe3efff798b129272795e4c33817af94953f3012-1',
      privateKey: '5JwZpANRoBePPLzUU79UD3PAWQm5S132pzAuJmHtdnnHmkg8Mne'
    }
    await request
      .post(`/masternode/`)
      .set('Content-type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .set('appclient', 'sysnode-info')
      .send(payload)
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.message).toEqual('created masterNode')
        done()
      })
  }, 30000);

  it('Update MasterNode ', async done => {
    let token = await getToken();
    let payload = {
      name: 'mn updated',
      txId: '875df36de0d49bc130d50c81fe3efff798b129272795e4c33817af94953f3012-1',
      privateKey: '5JwZpANRoBePPLzUU79UD3PAWQm5S132pzAuJmHtdnnHmkg8Mne'
    }
    await request
      .put(`/masternode/${masterNodeUid}`)
      .set('Content-type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .set('appclient', 'sysnode-info')
      .send({data: payload})
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.ok).toBeBoolean()
        expect(res.body.message).toEqual('MasterNode Updated')
        done()
      })
  }, 30000);

  it('Delete MasterNode ', async done => {
    let token = await getToken();
    await request
      .delete(`/masternode/${masterNodeUid}`)
      .set('Content-type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .set('appclient', 'sysnode-info')
      .then(res => {
        expect(res.statusCode).toBe(200)
        expect(res.body.ok).toBeBoolean();
        expect(res.body.message).toEqual('MasterNode Deleted');
        done()
      })
  }, 30000);

})
