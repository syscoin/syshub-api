const request = require('./config')
const { firebase } = require('../utils/config')
const { encryptAes } = require('../utils/encrypt')

require('jest-extended')

const email = 'Enter email Firebase User'
const pwd = 'Enter pwd Firebase User'
const faqUid = 'Enter User Uid'

/* Example:
{
   uid: 'vvEZEIo9qsaHQ0WYgoyq',
   title: 'am I a test?',
   description: '<p style="text-align:center;"><span style="color: rgb(255,255,255);font-size: 30px;">F.A.Q test</span></p>\n' +
            '<ul>\n' +
            '<li><a href="https://syscoin.org/assets/images/mediakit-pack.jpg" target="_blank"><span style="color: rgb(255,255,255);font-size: 30px;"><strong>Image Syscoin</strong></span></a><span style="color: rgb(255,255,255);font-size: 30px;"><strong> 👻</strong></span></li>\n' +
            '</ul>\n' +
            '<p></p>\n' +
            '<div style="text-align:none;"><img src="https://syscoin.org/assets/images/mediakit-pack.jpg" alt="undefined" style="height: auto;width: auto"/></div>\n' +
            '<p></p>\n',
   created_at: 1611771907
}
 */

const getToken = () => new Promise((resolve, reject) => {
  firebase
    .auth()
    .signInWithEmailAndPassword(email, pwd)
    .then((res) => {
      resolve(encryptAes(res.user.ya, process.env.KEY_FOR_ENCRYPTION))
    })
    .catch((err) => {
      reject(err)
    })
})

describe('interaction with firebase', () => {
  it('get all the FAQ', async (done) => {
    request
      .get('/faq/forall')
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(res.body).toBeObject()
        expect(res.body.faqs).toBeArray()
        done()
      })
  }, 30000)

  it('get all the FAQ with admin role', async (done) => {
    const token = await getToken()
    request
      .get('/faq/')
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .set('Authorization', `Bearer ${token}`)
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(res.body).toBeObject()
        expect(res.body.pageSize).not.toBeEmpty()
        expect(res.body.sizePerPage).not.toBeEmpty()
        expect(res.body.totalRecords).not.toBeEmpty()
        expect(res.body.totalPag).not.toBeEmpty()
        expect(res.body.currentPage).not.toBeEmpty()
        expect(res.body.previousPage).not.toBeEmpty()
        expect(res.body.nextPage).not.toBeEmpty()
        expect(res.body.faqs).toBeArray()
        done()
      })
  }, 30000)

  it('get all the FAQ with admin role', async (done) => {
    const token = await getToken()
    request
      .get(`/faq/${faqUid}`)
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .set('Authorization', `Bearer ${token}`)
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(res.body).toBeObject()
        expect(res.body.fq).not.toBeEmpty()
        expect(res.body.fq.updated_at).not.toBeEmpty()
        expect(res.body.fq.created_at).not.toBeEmpty()
        expect(res.body.fq.title).not.toBeEmpty()
        expect(res.body.fq.description).not.toBeEmpty()
        done()
      })
  }, 30000)

  it('create FAQ with admin role', async (done) => {
    const token = await getToken()
    const payload = {
      title: `am I a test${Math.random().toPrecision(2)}?`,
      description:
        '<p style="text-align:center;"><span style="color: rgb(255,255,255);font-size: 30px;">F.A.Q test</span></p>\n'
        + '<ul>\n'
        + '<li><a href="https://syscoin.org/assets/images/mediakit-pack.jpg" target="_blank"><span style="color: rgb(255,255,255);font-size: 30px;"><strong>Image Syscoin</strong></span></a><span style="color: rgb(255,255,255);font-size: 30px;"><strong> 👻</strong></span></li>\n'
        + '</ul>\n'
        + '<p></p>\n'
        + '<div style="text-align:none;"><img src="https://syscoin.org/assets/images/mediakit-pack.jpg" alt="undefined" style="height: auto;width: auto"/></div>\n'
        + '<p></p>\n',
    }
    request
      .post('/faq/')
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(res.body).toBeObject()
        expect(res.body.ok).toBeBoolean()
        expect(res.body.message).toEqual('data saved successfully')
        done()
      })
  }, 30000)

  it('update FAQ with admin role', async (done) => {
    const token = await getToken()
    const payload = {
      title: `am I a test${Math.random().toPrecision(2)}?`,
      description:
        '<p style="text-align:center;"><span style="color: rgb(255,255,255);font-size: 30px;">F.A.Q test</span></p>\n'
        + '<ul>\n'
        + '<li><a href="https://syscoin.org/assets/images/mediakit-pack.jpg" target="_blank"><span style="color: rgb(255,255,255);font-size: 30px;"><strong>Image Syscoin</strong></span></a><span style="color: rgb(255,255,255);font-size: 30px;"><strong> 👻</strong></span></li>\n'
        + '</ul>\n'
        + '<p></p>\n'
        + '<div style="text-align:none;"><img src="https://syscoin.org/assets/images/mediakit-pack.jpg" alt="undefined" style="height: auto;width: auto"/></div>\n'
        + '<p></p>\n',
    }
    request
      .put(`/faq/${faqUid}`)
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .set('Authorization', `Bearer ${token}`)
      .send({ data: payload })
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(res.body.ok).toBeBoolean()
        expect(res.body.message).toEqual('updated data')
        done()
      })
  }, 30000)

  it('delete FAQ with admin role', async (done) => {
    const token = await getToken()
    request
      .delete(`/faq/${faqUid}`)
      .set('Content-type', 'application/json')
      .set('appclient', 'sysnode-info')
      .set('Authorization', `Bearer ${token}`)
      .then((res) => {
        expect(res.statusCode).toBe(200)
        expect(res.body).toBeObject()
        expect(res.body.ok).toBeBoolean()
        expect(res.body.message).toEqual('faq successfully removed')
        done()
      })
  }, 30000)
})
