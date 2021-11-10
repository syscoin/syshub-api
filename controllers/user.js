const {admin} = require('../utils/config');
const {encryptAes} = require('../utils/encrypt');
const firebase = require("firebase");

/**
 * @function
 * @name getAllUser
 * @desc information of all users
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.query.email email to perform a search.
 * @param {string} req.query.page next page to perform the paging of the request.
 * @param {string} req.user is an opaque identifier for a user account obtained from the token.
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */

// eslint-disable-next-line consistent-return
const getAllUser = async (req, res, next) => {
    try {
        const pageSize = 20;
        const {email} = req.query;
        let {page} = req.query;
        const users = [];
        let userRecordAuth;

        const userRecordResponse = [];
        if (typeof page === 'undefined' || page === '0') page = 1;

        const totalUserRecords = await admin.firestore()
            .collection(process.env.COLLECTION_NAME_USERS)
            .get()
            .catch((err) => {
                throw err;
            });

        const userRecords = await admin.firestore()
            .collection(process.env.COLLECTION_NAME_USERS)
            .orderBy('twoFa', 'desc')
            .offset((page - 1) * pageSize)
            .limit(pageSize)
            .get()
            .catch((err) => {
                throw err;
            });

        // eslint-disable-next-line no-underscore-dangle
        const sizePerPage = userRecords._docs().length;
        // eslint-disable-next-line no-underscore-dangle
        const totalPag = Math.ceil(totalUserRecords._docs().length / pageSize);
        userRecords.docs.map((doc) => users.push({uid: doc.id}));

        // eslint-disable-next-line prefer-const
        userRecordAuth = await admin.auth()
            .getUsers(users)
            .catch((err) => {
                throw err;
            });

        const userRoleRecord = await admin.firestore()
            .collection(process.env.COLLECTION_NAME_ROLE)
            .get()
            .catch((err) => {
                throw err;
            });

        userRecordAuth.users.map(async (doc) => {
            // eslint-disable-next-line array-callback-return
            userRoleRecord.docs.find((el) => {
                if (el.id === doc.uid) {
                    const {role} = el.data();
                    userRecordResponse.push({
                        uid: doc.uid,
                        email: doc.email,
                        name: doc.displayName ? doc.displayName : 'there is no associated display name for this user',
                        role,
                    });
                }
            });
        });

        if (typeof email !== 'undefined' && email !== '') {
            const newUserRecordResponse = userRecordResponse.filter((e) => e.email.includes(email));
            return res.status(200).json({
                ok: true,
                pageSize,
                totalPag,
                totalRecords: sizePerPage,
                currentPage: Number(page),
                previousPage: Number(page) - 1,
                nextPage: Number(page) + 1,
                users: newUserRecordResponse,
            });
        }

        return res.status(200).json({
            ok: true,
            pageSize,
            sizePerPage,
            // eslint-disable-next-line no-underscore-dangle
            totalRecords: totalUserRecords._docs().length,
            totalPag,
            currentPage: Number(page),
            previousPage: Number(page) - 1,
            nextPage: Number(page) + 1,
            users: userRecordResponse,
        });
    } catch (err) {
        next(err);
    }
};

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
// eslint-disable-next-line consistent-return
const getOneUser = async (req, res, next) => {
    try {
        const {id} = req.params;
        const authData = {};
        const roles = [];
        if (req.user !== id) {
            return res.status(403).json({
                ok: false,
                message: 'you do not have permissions to perform this action',
            });
        }
        const user = await admin.auth()
            .getUser(id)
            .catch((err) => {
                throw err;
            });

        const moreInformation = await admin.firestore()
            .collection(process.env.COLLECTION_NAME_USERS)
            .doc(id)
            .get()
            .catch((err) => {
                throw err;
            });

        const moreRoleInformation = await admin.firestore()
            .collection(process.env.COLLECTION_NAME_ROLE)
            .doc(id)
            .get()
            .catch((err) => {
                throw err;
            });

        // eslint-disable-next-line no-underscore-dangle,no-restricted-syntax
        for (const key in moreInformation._fieldsProto) {
            // eslint-disable-next-line no-underscore-dangle,no-prototype-builtins
            if (moreInformation._fieldsProto.hasOwnProperty(key)) {
                if (key !== 'gAuthSecret') {
                    // eslint-disable-next-line no-underscore-dangle
                    authData[key] = moreInformation._fieldsProto[key].booleanValue;
                }
            }
        }

        // eslint-disable-next-line no-underscore-dangle,array-callback-return
        moreRoleInformation._fieldsProto.role.arrayValue.values.map((role) => {
            roles.push(role.stringValue);
        });

        const userResponse = {...user, authData, roles};
        // delete userResponse.uid;
        delete userResponse.passwordHash;
        delete userResponse.passwordSalt;
        delete userResponse.tenantId;
        return res.status(200).json({ok: true, user: userResponse});
    } catch (err) {
        next(err);
    }
};

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

// eslint-disable-next-line consistent-return
const getUser2fa = async (req, res, next) => {
    try {
        const {id} = req.params;
        if (req.user !== id) {
            return res.status(403).json({
                ok: false,
                message: 'you do not have permissions to perform this action',
            });
        }
        const user = await admin.firestore()
            .collection(process.env.COLLECTION_NAME_USERS)
            .doc(id)
            .get()
            .catch((err) => {
                throw err;
            });
        // eslint-disable-next-line no-underscore-dangle
        if (typeof user._fieldsProto !== 'undefined') {
            const userData = {};
            // eslint-disable-next-line no-underscore-dangle,no-restricted-syntax
            for (const key in user._fieldsProto) {
                // eslint-disable-next-line no-underscore-dangle,no-prototype-builtins
                if (user._fieldsProto.hasOwnProperty(key)) {
                    if (key === 'twoFa' || key === 'gAuth' || key === 'sms') {
                        // eslint-disable-next-line no-underscore-dangle
                        userData[key] = user._fieldsProto[key].booleanValue;
                    } else if (key === 'gAuthSecret') {
                        // eslint-disable-next-line no-underscore-dangle
                        userData[key] = user._fieldsProto[key].stringValue;
                    }
                }
            }

            return res.status(200).json({ok: true, user: userData});
        }
        return res.status(204).json({ok: false, message: 'not content'});
    } catch (err) {
        next(err);
    }
};

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

// eslint-disable-next-line consistent-return
const updateUser = async (req, res, next) => {
    try {
        const {id} = req.params;
        if (req.user !== id) {
            return res.status(403).json({
                ok: false,
                message: 'you do not have permissions to perform this action',
            });
        }
        const {data} = req.body;
        if (!data) return res.status(406).json({ok: false, message: 'required fields'});
        await admin.auth()
            .getUser(id)
            .catch((err) => {
                throw err;
            });
        await admin.auth()
            .updateUser(id, data)
            .catch((err) => {
                throw err;
            });
        return res.status(200).json({ok: true, message: 'update'});
    } catch (err) {
        if (err.message === 'There is no user record corresponding to the provided identifier.') {
            return res.status(406).json({
                ok: false,
                message: 'User invalid',
            });
        }
        next(err);
    }
};

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
// eslint-disable-next-line consistent-return
const updateActionsUser = async (req, res, next) => {
    try {
        const {id} = req.params;
        if (req.user !== id) {
            return res.status(403).json({
                ok: false,
                message: 'you do not have permissions to perform this action',
            });
        }
        const {data} = req.body;
        const newData = {};
        if (!data) return res.status(406).json({ok: false, message: 'required fields'});
        if (data.twoFa === true) {
            if (data.sms === true && data.gAuth === true) {
                return res.status(400).json({
                    ok: false,
                    message: 'invalid methods'
                })
            }
        }
        // eslint-disable-next-line no-restricted-syntax
        for (const key in data) {
            if (key !== 'pwd' && key !== 'twoFa' && key !== 'sms' && key !== 'gAuth' && key !== 'gAuthSecret') {
                return res.status(406).json({
                    ok: false,
                    message: 'You can\'t update',
                });
            }
        }

        const user = await admin.firestore()
            .collection(process.env.COLLECTION_NAME_USERS)
            .doc(id)
            .get()
            .catch((err) => {
                throw err;
            });
        const verify = await admin.auth().getUser(id)
        const x = await firebase.auth().signInWithEmailAndPassword(verify.email, data.pwd);
        // eslint-disable-next-line no-underscore-dangle
        if (user._fieldsProto) {
            // eslint-disable-next-line no-restricted-syntax
            for (const key in data) {
                // eslint-disable-next-line no-prototype-builtins
                if (data.hasOwnProperty(key)) {
                    if (key === 'gAuthSecret') {
                        if (data[key] === null) {
                            newData[key] = data[key];
                        } else {
                            newData[key] = encryptAes(data[key], process.env.KEY_FOR_ENCRYPTION);
                        }
                    } else {
                        if (key !== 'pwd') {
                            newData[key] = data[key];
                        }
                    }
                }
            }
        }
        await admin.firestore()
            .collection(process.env.COLLECTION_NAME_USERS)
            .doc(id)
            .update(newData)
            .catch((err) => {
                throw err;
            });
        return res.status(200).json({ok: true, message: 'Updated data'});
    } catch (err) {
        // if (err.message === 'signInWithEmailAndPassword failed: Second argument "password" must be a valid string.'){
        //     return  res.status(406).json({
        //         ok:false,
        //         message:'invalid changes'
        //     })
        // }
        next(err);
    }
};

// not implemented
// eslint-disable-next-line no-unused-vars
const UpdatePhotoUser = async (req, res, next) => {
    try {
        await admin.storage().bucket('');
    } catch (err) {
        next(err);
    }
};

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
// eslint-disable-next-line consistent-return
const deleteUser = async (req, res, next) => {
    try {
        const {id} = req.params;
        const mnUser = [];
        const proposalUser = [];

        if (req.user !== id) {
            return res.status(403).json({
                ok: false,
                message: 'you do not have permissions to perform this action',
            });
        }

        const user = await admin.firestore()
            .collection(process.env.COLLECTION_NAME_USERS)
            .doc(id)
            .get()
            .catch((err) => {
                throw err;
            });

        // eslint-disable-next-line no-underscore-dangle
        if (user._fieldsProto) {
            // eslint-disable-next-line no-underscore-dangle
            if (user._fieldsProto.addressesList) {
                // eslint-disable-next-line no-underscore-dangle,array-callback-return
                user._fieldsProto.addressesList.arrayValue.values.map((mn) => {
                    mnUser.push(mn.stringValue);
                });
                if (mnUser.length > 0) {
                    await Promise.all(mnUser.map(async (mn) => {
                        await admin.firestore()
                            .collection(process.env.COLLECTION_NAME_ADDRESS)
                            .doc(mn)
                            .delete()
                            .catch((err) => {
                                throw err;
                            });
                    })).catch((err) => {
                        throw err;
                    });
                }
            }
            // eslint-disable-next-line no-underscore-dangle
            if (user._fieldsProto.proposalList) {
                // eslint-disable-next-line array-callback-return,no-underscore-dangle
                user._fieldsProto.proposalList.arrayValue.values.map((proposal) => {
                    proposalUser.push(proposal.stringValue);
                });
                if (proposalUser.length > 0) {
                    await Promise.all(proposalUser.map(async (proposal) => {
                        await admin.firestore()
                            .collection(process.env.COLLECTION_NAME_PROPOSAL)
                            .doc(proposal)
                            .delete()
                            .catch((err) => {
                                throw err;
                            });
                    })).catch((err) => {
                        throw err;
                    });
                }
            }
        }
        await admin.firestore()
            .collection(process.env.COLLECTION_NAME_USERS)
            .doc(id)
            .delete()
            .catch((err) => {
                throw err;
            });

        await admin.firestore()
            .collection(process.env.COLLECTION_NAME_ROLE)
            .doc(id)
            .delete()
            .catch((err) => {
                throw err;
            });

        await admin.auth()
            .deleteUser(id)
            .catch((err) => {
                throw err;
            });

        const nUser = await admin.firestore()
            .collection(process.env.COLLECTION_NAME_INFO)
            .doc(process.env.COLLECTION_INFO_UID)
            .get()
            .catch((err) => {
                throw err;
            });

        await admin.firestore()
            .collection(process.env.COLLECTION_NAME_INFO)
            .doc(process.env.COLLECTION_INFO_UID)
            // eslint-disable-next-line no-underscore-dangle
            .update({nUsers: Number(nUser._fieldsProto.nUsers.integerValue) - 1})
            .catch((err) => {
                throw err;
            });
        return res.status(200).json({ok: true, message: 'delete'});
    } catch (err) {
        next(err);
    }
};

const signOut = async (req, res, next) => {
    const {token} = req.body;
    if (req.user !== req.params.id) {
        return res.status(403).json({
            ok: false,
            message: 'you do not have permissions to perform this action',
        });
    }
    try {
        await admin.firestore()
            .collection(process.env.COLLECTION_NAME_TOKENS).add({token})
        await admin.auth().revokeRefreshTokens(req.params.id)
        res.status(200).json({
            ok: true
        })
    } catch (err) {
        next(err)
    }
}

module.exports = {
    getAllUser, getOneUser, getUser2fa, updateUser, updateActionsUser, deleteUser, signOut
};
