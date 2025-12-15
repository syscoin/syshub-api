const { signInWithEmailAndPassword, getAuth } = require('firebase/auth')
const { admin, firebaseApp } = require('../utils/config')
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
// eslint-disable-next-line consistent-return
const register = async (req, res, next) => {
  try {
    const { uid } = req.body
    if (!uid) return res.status(406).json({ ok: false, message: 'required fields' })

    const userData = {
      sms: false,
      gAuth: false,
      twoFa: false,
      gAuthSecret: null,
    }
    const verifyUser = await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_USERS)
      .doc(uid)
      .get()
    // eslint-disable-next-line no-underscore-dangle
    if (typeof verifyUser._fieldsProto !== 'undefined') {
      return res.status(406).json({
        ok: false,
        message: 'Existing users',
      })
    }
    await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_USERS)
      .doc(uid)
      .set(userData)
    const nUser = await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_INFO)
      .doc(process.env.COLLECTION_INFO_UID)
      .get()
    await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_INFO)
      .doc(process.env.COLLECTION_INFO_UID)
      // eslint-disable-next-line no-underscore-dangle
      .update({ nUsers: Number(nUser._fieldsProto.nUsers.integerValue) + 1 })
    await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_ROLE)
      .doc(uid)
      .set({ role: [process.env.ROLE_USER] })
    return res.status(200).json({ ok: true, message: 'registered user' })
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
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: 'Required fields' })
    }

    // Use Firebase authentication instead of hardcoded credentials
    let userCredential
    try {
      userCredential = await signInWithEmailAndPassword(
        getAuth(firebaseApp),
        email,
        password
      )
    } catch (authErr) {
      // Handle authentication errors
      if (authErr.code === 'auth/wrong-password' || authErr.code === 'auth/user-not-found') {
        return res.status(401).json({ ok: false, message: 'Invalid credentials' })
      }
      if (authErr.code === 'auth/too-many-requests') {
        return res.status(429).json({ ok: false, message: 'Too many failed attempts. Please try again later.' })
      }
      if (authErr.code === 'auth/invalid-email') {
        return res.status(400).json({ ok: false, message: 'Invalid email format' })
      }
      throw authErr
    }

    // Check if user has admin role
    const roleDoc = await admin.firestore()
      .collection(process.env.COLLECTION_NAME_ROLE)
      .doc(userCredential.user.uid)
      .get()

    const roles = roleDoc.data()?.role || []
    if (!roles.includes(process.env.ROLE_ADMIN)) {
      return res.status(403).json({ ok: false, message: 'Access denied. Admin privileges required.' })
    }

    // Get Firebase ID token (already secure with proper signing)
    const idToken = await userCredential.user.getIdToken()

    return res.status(200).json({ ok: true, token: idToken })

  } catch (err) {
    next(err)
  }
}

module.exports = {
  register,
  login,
}
