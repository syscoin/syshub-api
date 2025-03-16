const { admin } = require('../utils/config')

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
const firebaseAuthenticated = async (req, res, next) => {
  try {
    const reg = /"/g
    const authHeader = req.header('Authorization')
    if (!authHeader) {
      return res.status(401).json({ ok: false, message: 'Not authenticated' })
    }
    const token = authHeader.replace('Bearer', '').trim()
    const decodedToken = await admin
      .auth()
      .verifyIdToken(token.replace(reg, ''))

    const user = await admin.auth().getUser(decodedToken.uid)

    if (!user) {
      return res.status(401).json({ ok: false, message: 'Not authenticated' })
    }

    const tokenSearch = req.header('Authorization').replace('Bearer', '').trim()
    const tokenExpired = await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_TOKENS)
      .where('token', '==', `${tokenSearch}`)
      .get()
    if (!tokenExpired.empty) {
      return res.status(401).json({ ok: false, message: 'token has expired' })
    }
    req.user = user.uid

    return next()
  } catch (err) {
    if (
      err.message.split('.')[0] ===
      'Firebase ID token has "kid" claim which does not correspond to a known public key'
    ) {
      return res.status(401).json({
        ok: false,
        message: 'token has expired',
      })
    }
    if (err.message.split('.')[0] === 'Firebase ID token has expired') {
      return res.status(401).json({
        ok: false,
        message: 'token has expired',
      })
    }
    if (err.message.split('.')[0] === 'Decoding Firebase ID token failed') {
      return res.status(401).json({
        ok: false,
        message: 'Decoding Firebase ID token failed.',
      })
    }
    return next(err)
  }
}

module.exports = firebaseAuthenticated
