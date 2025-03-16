const { admin } = require('../utils/config')

const isAdmin = async (req, res, next) => {
  const verifyAdminRole = await admin
    .firestore()
    .collection(process.env.COLLECTION_NAME_ROLE)
    .doc(req.user)
    .get()
    .catch((err) => {
      throw err
    })
  // eslint-disable-next-line no-underscore-dangle
  const userRecordRole =
    verifyAdminRole._fieldsProto.role.arrayValue.values.find(
      (role) => role.stringValue === process.env.ROLE_ADMIN
    )

  if (typeof userRecordRole !== 'undefined') {
    return next()
  }
  return res.status(401).json({
    ok: false,
    message: 'you do not have permission to perform this action',
  })
}
module.exports = isAdmin
