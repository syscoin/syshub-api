let {admin} = require('../utils/config');

let isAdmin = async (req, res, next) => {
    let verifyAdminRole = await admin.firestore()
        .collection(process.env.COLLECTION_NAME_ROLE)
        .doc(req.user)
        .get()
        .catch(err => {
            throw err
        })
    let userRecordRole = verifyAdminRole._fieldsProto.role.arrayValue.values.find(role => role.stringValue === process.env.ROLE_ADMIN)

    if (typeof userRecordRole !== 'undefined') {
        return next()
    } else {
        return res.status(401).json({ok: false, message: 'you do not have permission to perform this action'})
    }
}
module.exports = isAdmin;