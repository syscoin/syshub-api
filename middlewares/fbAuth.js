const {admin} = require('../utils/config');
const {decryptAes} = require('../utils/encrypt')
const jwt_decode = require('jwt-decode');
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
let firebaseAuthenticated = async (req, res, next) => {
    try {
        let token;
        let reg = /"/g;
        if (req.header('Authorization')) {
            token = decryptAes(req.header('Authorization').replace('Bearer', '').trim(), process.env.KEY_FOR_ENCRYPTION)
            const jwt = jwt_decode(token.replace(reg, ''))
            const decodedToken = await admin.auth().verifyIdToken(token.replace(reg, ''));
            const user = await admin.auth().getUser(jwt.user_id)

            if (!user) {
                return res.status(401).json({ok: false, message: 'Not authenticated'});
            }

            if ((new Date().getTime() / 1000) > decodedToken.exp) {
                return res.status(401).json({ok: false, message: 'Not authenticated'});
            }

            if (decodedToken.user_id === jwt.user_id) {
                req.user = user.uid
                return next()
            } else {
                return res.status(401).json({ok: false, message: 'Not authenticated'});
            }

            // admin.auth().verifyIdToken(token.replace(reg, '')).then((decodedToken) => {
            //   admin.auth().getUser(decodedToken.user_id).then((user) => {
            //     if ((new Date().getTime() / 1000) > decodedToken.exp) {
            //       return res.status(401).json({ok: false, message: 'Not authenticated'});
            //     }
            //     if (decodedToken.user_id === jwt.user_id) {
            //       req.user = user.uid
            //       return next()
            //     }else{
            //       console.log('entro aqui')
            //       return res.status().json({
            //
            //       })
            //     }
            //   }).catch((err) => {
            //     throw err
            //   })
            // }).catch((err) => {
            //   if (err.message.split('.')[0] === 'Firebase ID token has "kid" claim which does not correspond to a known public key') return res.status(401).json({ok: false, message: 'token has expired'});
            //   if (err.message.split('.')[0] === 'Firebase ID token has expired') return res.status(401).json({ok: false, message: 'token has expired'});
            //   if (err.message.split('.')[0] === 'Decoding Firebase ID token failed') return res.status(401).json({ok: false, message: 'Decoding Firebase ID token failed.'});
            //   throw err
            // })
        } else {
            return res.status(401).json({ok: false, message: 'Not authenticated'})
        }
    } catch (err) {
        if (err.message.split('.')[0] === 'Firebase ID token has "kid" claim which does not correspond to a known public key') return res.status(401).json({
            ok: false,
            message: 'token has expired'
        });
        if (err.message.split('.')[0] === 'Firebase ID token has expired') return res.status(401).json({
            ok: false,
            message: 'token has expired'
        });
        if (err.message.split('.')[0] === 'Decoding Firebase ID token failed') return res.status(401).json({
            ok: false,
            message: 'Decoding Firebase ID token failed.'
        });
        throw err
    }
}

module.exports = firebaseAuthenticated;
