const {admin} = require('../utils/config');
const {decryptAes} = require('../utils/encrypt')

/**
 * @function
 * @name firebaseAuthenticated
 * @desc firebase jwt verification middleware for access to user and application use cases
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.header.Authorization obtaining the token
 * @param {string} req.user is an opaque identifier for a user account obtained from the token.
 * @param {function} next middleware success
 *
 * @return {object} positive answer
 */
let firebaseAuthenticated = (req, res, next) => {
  try {
    let token;
    let reg = /"/g;
    if (req.header('Authorization')) {
      token = decryptAes(req.header('Authorization').replace('Bearer', '').trim(), process.env.KEY_FOR_ENCRYPTION)
      admin.auth().verifyIdToken(token.replace(reg, '')).then((decodedToken) => {
        admin.auth().getUser(decodedToken.uid).then((user) => {
          if ((new Date().getTime() / 1000) > decodedToken.exp) {
            return res.status(401).json({ok: false, message: 'Not authenticated'});
          }
          if (decodedToken.uid === user.uid) {
            req.user = user.uid
            return next()
          }
        }).catch((err) => {
          throw err
        })
      }).catch((err) => {
        if (err.message.split('.')[0] === 'Firebase ID token has "kid" claim which does not correspond to a known public key') return res.status(401).json({ok: false, message: 'token has expired'});
        if (err.message.split('.')[0] === 'Firebase ID token has expired') return res.status(401).json({ok: false, message: 'token has expired'});
        if (err.message.split('.')[0] === 'Decoding Firebase ID token failed') return res.status(401).json({ok: false, message: 'Decoding Firebase ID token failed.'});
        throw err
      })
    } else {
      return res.status(401).json({ok: false, message: 'Not authenticated'})
    }
  } catch (err) {
    throw err
  }
}

module.exports = firebaseAuthenticated;
