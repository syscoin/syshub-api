const {admin} = require('../utils/config');
const {encryptAes} = require('../utils/encrypt');

/**
 * @function
 * @name getOneUser
 * @desc user information
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.params.id is an opaque identifier for a user account.
 * @param {string} req.user is an opaque identifier for a user account obtained from the token.
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */
const getOneUser = async (req, res, next) => {
  try {
    let {id} = req.params;
    let authData = {};
    if (req.user !== id) return res.status(406).json({ok: false, message: 'you do not have permissions to perform this action'});
    let user = await admin.auth().getUser(id).catch((err) => {
      throw err
    })
    let moreInformation = await admin.firestore().collection(process.env.COLLECTION_NAME_USERS).doc(id).get().catch(err => {
      throw err
    })

    for (let key in moreInformation._fieldsProto) {
      if (key !== 'gAuthSecret') {
        authData[key] = moreInformation._fieldsProto[key].booleanValue
      }

    }
    let userResponse = {...user, authData};
    // delete userResponse.uid;
    delete userResponse.passwordHash;
    delete userResponse.passwordSalt;
    delete userResponse.tenantId;
    return res.status(200).json({ok: true, user: userResponse});
  } catch (err) {
    next(err)
  }
}

/**
 * @function
 * @name getUser2fa
 * @desc 2fa user information
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.params.id is an opaque identifier for a user account.
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */

const getUser2fa = async (req, res, next) => {
  try {
    let {id} = req.params;
    let user = await admin.firestore().collection(process.env.COLLECTION_NAME_USERS).doc(id).get();
    if (typeof user._fieldsProto !== "undefined") {
      let userData = {}
      for (const key in user._fieldsProto) {
        if (key === "twoFa" || key === "gAuth" || key === "sms") {
          userData[key] = user._fieldsProto[key].booleanValue
        } else if (key === "gAuthSecret") {
          userData[key] = user._fieldsProto[key].stringValue
        }
      }
      return res.status(200).json({ok: true, user: userData})
    } else {
      return res.status(204).json({ok: false, message: 'not content'})
    }
  } catch (err) {
    next(err)
  }
}

/**
 * @function
 * @name updateUser
 * @desc user data update
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.params.id is an opaque identifier for a user account.
 * @param {string} req.user is an opaque identifier for a user account obtained from the token.
 * @param {object} req.body data obtained from the front for update
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */

const updateUser = async (req, res, next) => {
  try {
    let {id} = req.params;
    if (req.user !== id) return res.status(406).json({ok: false, message: 'you do not have permissions to perform this action'});
    let {data} = req.body;
    if (!data) return res.status(406).json({ok: false, message: 'required fields'});
    await admin.auth().getUser(id).catch(err => {
      throw err
    })
    await admin.auth().updateUser(id, data).catch((err) => {
      throw err
    })
    return res.status(200).json({ok: true, message: 'update'});
  } catch (err) {
    if (err.message === 'There is no user record corresponding to the provided identifier.') return res.status(406).json({ok: false, message: 'User invalid'});
    next(err)
  }
}

/**
 * @function
 * @name updateActionsUser
 * @desc function referring only to the user's 2fa update
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.params.id is an opaque identifier for a user account.
 * @param {string} req.user is an opaque identifier for a user account obtained from the token.
 * @param {object} req.body data obtained from the front for update
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */
const updateActionsUser = async (req, res, next) => {
  try {
    let {id} = req.params;
    if (req.user !== id) return res.status(406).json({ok: false, message: 'you do not have permissions to perform this action'});
    let {data} = req.body;
    let newData = {};
    if (!data) return res.status(406).json({ok: false, message: 'required fields'});
    for (let key in data) if (key !== 'twoFa' && key !== 'sms' && key !== 'gAuth' && key !== 'gAuthSecret') return res.status(406).json({ok: false, message: 'You can\'t update'});

    let user = await admin.firestore().collection(process.env.COLLECTION_NAME_USERS).doc(id).get().catch(err => {
      throw err
    })

    if (user._fieldsProto) {
      for (let key in data) {
        if (key === 'gAuthSecret') {
          if (data[key] === null) {
            newData[key] = data[key]
          } else {
            newData[key] = encryptAes(data[key], process.env.KEY_FOR_ENCRYPTION)
          }
        } else {
          newData[key] = data[key]
        }
      }
    }
    await admin.firestore().collection(process.env.COLLECTION_NAME_USERS).doc(id).update(newData).catch(err => {
      throw err
    })
    return res.status(200).json({ok: true, message: 'Updated data'});
  } catch (err) {
    next(err)
  }
}


//not implemented
const UpdatePhotoUser = async (req, res, next) => {
  try {
    await admin.storage().bucket('')
  } catch (err) {
    next(err)
  }
}

/**
 * @function
 * @name deleteUser
 * @desc delete all user data and the same from the app
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.params.id is an opaque identifier for a user account.
 * @param {string} req.user is an opaque identifier for a user account obtained from the token.
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */
const deleteUser = async (req, res, next) => {
  try {
    let {id} = req.params;
    let mnUser = [];
    let proposalUser = [];

    if (req.user !== id) return res.status(406).json({ok: false, message: 'you do not have permissions to perform this action'});

    let user = await admin.firestore().collection(process.env.COLLECTION_NAME_USERS).doc(id).get().catch(err => {
      throw err
    })

    if (user._fieldsProto) {
      if (user._fieldsProto.mNodeList) {
        user._fieldsProto.mNodeList.arrayValue.values.map(mn => {
          mnUser.push(mn.stringValue)
        })
        if (mnUser.length > 0) {
          await Promise.all(mnUser.map(async mn => {
            await admin.firestore().collection(process.env.COLLECTION_NAME_MASTERNODES).doc(mn).delete().catch(err => {
              throw err
            })
          })).catch(err => {
            throw err
          })
        }
      }
      if (user._fieldsProto.proposalList) {
        user._fieldsProto.proposalList.arrayValue.values.map(proposal => {
          proposalUser.push(proposal.stringValue)
        })
        if (proposalUser.length > 0) {
          await Promise.all(proposalUser.map(async proposal => {
            await admin.firestore().collection(process.env.COLLECTION_NAME_PROPOSAL).doc(proposal).delete().catch(err => {
              throw err
            })
          })).catch(err => {
            throw err
          })
        }
      }
    }
    await admin.firestore().collection(process.env.COLLECTION_NAME_USERS).doc(id).delete().catch(err => {
      throw err
    })
    await admin.auth().deleteUser(id).catch(err => {
      throw err
    })

    let nUser = await admin.firestore().collection(process.env.COLLECTION_NAME_INFO).doc(process.env.COLLECTION_INFO_UID).get()
    await admin.firestore().collection(process.env.COLLECTION_NAME_INFO).doc(process.env.COLLECTION_INFO_UID).update({nUsers: Number(nUser[`_fieldsProto`][`nUsers`][`integerValue`]) - 1})
    return res.status(200).json({ok: true, message: 'delete'});
  } catch (err) {
    next(err)
  }
}


module.exports = {getOneUser, getUser2fa, updateUser, updateActionsUser, deleteUser}
