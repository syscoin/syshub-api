const {admin} = require('../utils/config');

const getAllAdmins = async (req, res, next) => {
    try {
        let userAdmin = await admin.firestore()
            .collection(process.env.COLLECTION_NAME_ROLE)
            .where(process.env.COLLECTION_NAME_ROLE, "array-contains", process.env.ROLE_ADMIN)
            .get()
            .catch(err => {
                throw err
            })
        Promise.all(userAdmin._docs().map(async (doc) => {
            let userInfo = await admin.auth()
                .getUser(doc.id)
                .catch(err => {
                    throw err
                })
            return {
                uid: doc.id,
                role: doc.data().role,
                email: userInfo.email,
                emailVerified: userInfo.emailVerified,
                phoneNumber: userInfo.phoneNumber ? userInfo.phoneNumber : null,
                displayName: userInfo.displayName ? userInfo.displayName : null,
            }
        })).then(usersDocs => {
            return res.status(200).json({ok: true, users: usersDocs});
        }).catch(err => {
            throw err
        })
    } catch (err) {
        next(err)
    }
};

const createAdmin = async (req, res, next) => {
    try {
        let {name, email, pwd, uid} = req.body;
        if (!uid) {
            if (!name || !email || !pwd) return res.status(406).json({ok: false, message: 'required fields'});
            let userRecord = await admin.auth().createUser({
                email: email,
                emailVerified: false,
                password: pwd,
                displayName: name,
                disabled: false,

            }).catch(err => {
                throw err
            })
            let userData = {
                sms: false,
                gAuth: false,
                twoFa: false,
                gAuthSecret: null
            }
            await admin.firestore()
                .collection(process.env.COLLECTION_NAME_USERS)
                .doc(userRecord.uid)
                .set(userData)
                .catch(err => {
                    throw err
                })
            await admin.firestore()
                .collection(process.env.COLLECTION_NAME_ROLE)
                .doc(userRecord.uid)
                .set({role: [process.env.ROLE_USER, process.env.ROLE_ADMIN]})
                .catch(err => {
                    throw err
                })
            return res.status(200).json({ok: true, message: 'user created'})
        } else {
            let userRoles = [];
            let userRecord = await admin.auth().getUserByEmail(email)
            let userRoleRecord = await admin.firestore()
                .collection(process.env.COLLECTION_NAME_ROLE)
                .doc(userRecord.uid)
                .get().catch(err => {
                    throw err
                })
            if (typeof userRoleRecord._fieldsProto.role.arrayValue.values.find(role => role.stringValue === process.env.ROLE_ADMIN) === "undefined") {
                userRoleRecord._fieldsProto.role.arrayValue.values.map(role => {
                    userRoles.push(role.stringValue)
                })
                userRoles.push(process.env.ROLE_ADMIN)
                await admin.firestore()
                    .collection(process.env.COLLECTION_NAME_ROLE)
                    .doc(userRecord.uid)
                    .set({role: userRoles})
                    .catch(err => {
                        throw err
                    })
                return res.status(200).json({ok: true, message: 'role added successfully'})
            } else {
                return res.status(406).json({ok: false, message: 'the user is already an administrator'});
            }
        }
    } catch (err) {
        if (err.message === 'There is no user record corresponding to the provided identifier.') return res.status(406).json({
            ok: false,
            message: 'There is no user record corresponding to the provided identifier.'
        })
        if (err.message === 'The user with the provided phone number already exists.') return res.status(406).json({
            ok: false,
            message: 'The user with the provided phone number already exists.'
        })
        if (err.message === 'The email address is already in use by another account.') return res.status(406).json({
            ok: false,
            message: 'The user with the provided phone number already exists.'
        })
        next(err)
    }
};

const updateAdmin = async (req, res, next) => {
    try {
        let {id} = req.params;
        let {data} = req.body;
        let verifyExistingUser = await admin.firestore()
            .collection(process.env.COLLECTION_NAME_USERS)
            .doc(id)
            .get()
            .catch(err => {
                throw err
            })
    } catch (err) {
        next(err)
    }
};

const deleteAdmin = async (req, res, next) => {
    try {
        let {id} = req.params;
        let verifyUser = await admin.firestore()
            .collection(process.env.COLLECTION_NAME_USERS)
            .doc(id)
            .get()
            .catch(err => {
                throw err
            })

        if (typeof verifyUser._fieldsProto === "undefined") return res.status(406).json({
            ok: false,
            message: 'user not accepted'
        });

        let userRol = await admin.firestore()
            .collection(process.env.COLLECTION_NAME_ROLE)
            .doc(id)
            .get()
            .catch(err => {
                throw err
            })

        userRol = userRol.data();
        let idx = userRol.role.findIndex(elem => (elem === process.env.ROLE_ADMIN));
        if (idx < 0) return res.status(406).json({ok: false, message: 'the user is not managed'});
        userRol.role.splice(idx, 1)
        await admin.firestore()
            .collection(process.env.COLLECTION_NAME_ROLE)
            .doc(id)
            .set(userRol)
            .catch(err => {
                throw err
            })
        return res.status(200).json({ok: true, message: 'the user is no longer managed'})
    } catch (err) {
        next(err)
    }
};


module.exports = {
    getAllAdmins,
    createAdmin,
    updateAdmin,
    deleteAdmin
}

