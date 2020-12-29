const {admin} = require('../utils/config');
const jwt = require('jsonwebtoken')
/**
 * @function
 * @name register
 * @desc User registration for table of more user information, it is used to link your uid for extra user information
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.body.uid  is an opaque identifier for a user account.
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer example {ok: true, message: registered user}
 */
const register = async (req, res, next) => {
    try {
        let {uid} = req.body;
        if (!uid) return res.status(406).json({ok: false, message: 'required fields'});
        // if (!email || !password) return res.status(406).json({ok: false, message: 'Campos requeridos'});
        // if (password.length < 7) return res.status(406).json({ok: false, message: 'password no less than 8 characters'});
        // let verifyUsername = await admin.firestore().collection('users').where('username', '==', username).get()
        // if (!verifyUsername.empty) return res.status(406).json({ok: false, message: 'nombre de usuario en uso'})
        // let user = await firebase.auth().createUserWithEmailAndPassword(email, password).catch((err) => {
        //   throw err
        // })
        let userData = {
            sms: false,
            gAuth: false,
            twoFa: false,
            gAuthSecret: null
        }
        let verifyUser = await admin.firestore().collection(process.env.COLLECTION_NAME_USERS).doc(uid).get()
        if (typeof verifyUser._fieldsProto !== "undefined") return res.status(406).json({
            ok: false,
            message: 'Existing users'
        });
        await admin.firestore().collection(process.env.COLLECTION_NAME_USERS).doc(uid).set(userData)
        let nUser = await admin.firestore().collection(process.env.COLLECTION_NAME_INFO).doc(process.env.COLLECTION_INFO_UID).get()
        await admin.firestore().collection(process.env.COLLECTION_NAME_INFO).doc(process.env.COLLECTION_INFO_UID).update({nUsers: Number(nUser[`_fieldsProto`][`nUsers`][`integerValue`]) + 1})
        await admin.firestore().collection(process.env.COLLECTION_NAME_ROLE).doc(uid).set({role: [process.env.ROLE_USER]})
        return res.status(200).json({ok: true, message: 'registered user'});
    } catch (err) {
        // if (err.message === 'The email address is already in use by another account.') return res.status(200).json({ok: false, message: 'The email address is already in use by another account.'})
        next(err)
    }
}


/**
 * @function
 * @name login
 * @desc login for the visual part of the api
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.body.email user email
 * @param {string} req.body.password user password
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer example {ok: true, token: token fakeUser}
 */

const login = async (req, res, next) => {
    try {
        let {email, password} = req.body;
        if (email !== process.env.EMAIL_DASHBOARD ||
            password !== process.env.PASSWORD_DASHBOARD) {
            return res.status(406).json({ok: false, message: 'wrong username or password'});
        } else {
            jwt.sign(
                {account: process.env.EMAIL_DASHBOARD},
                Buffer.from(process.env.PASSWORD_DASHBOARD).toString('base64'),
                {expiresIn: "7d"}, function (err, token) {
                    if (err) {
                        throw err
                    }
                    return res.status(200).json({ok: true, token})
                })
        }
    } catch (err) {
        next(err)
    }


    // do not use!
    // try {
    //   let {email, password} = req.body;
    //   if (!email || !password) return res.status(406).json({ok: false, message: 'Required fields'});
    //   firebase.auth().signInWithEmailAndPassword(email, password).then((fbUser) => {
    //     firebase.auth().currentUser.getIdToken(true).then((idToken) => {
    //       return res.status(200).json({ok: true, email, idToken, refreshToken: fbUser.user.refreshToken});
    //     }).catch((err) => {
    //       throw err
    //     })
    //   }).catch((err) => {
    //     if (err.message === 'There is no user record corresponding to this identifier. The user may have been deleted.') return res.status(406).json({ok: false, message: 'non-existent user, please register'});
    //     if (err.message === 'The password is invalid or the user does not have a password.') return res.status(406).json({ok: false, message: err.message});
    //     if (err.message === 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.') return res.status(406).json({ok: false, message: err.message});
    //     if (err.message === 'A network error (such as timeout, interrupted connection or unreachable host) has occurred.') return res.status(500).json({ok: false, message: 'A network error (such as timeout, interrupted connection or unreachable host) has occurred.'})
    //     throw err
    //   })
    // } catch (err) {
    //   next(err)
    // }
}


module.exports = {
    register,
    login
}
