const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.addUserDataForRegister = functions.auth
  .user()
  .onCreate(async (user) => {
    const userData = {
      sms: false,
      gAuth: false,
      twoFa: false,
      gAuthSecret: null,
    };
    await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_USERS)
      .doc(user.uid)
      .set(userData);
    const nUser = await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_INFO)
      .doc(process.env.COLLECTION_INFO_UID)
      .get();
    await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_INFO)
      .doc(process.env.COLLECTION_INFO_UID)
      // eslint-disable-next-line no-underscore-dangle
      .update({ nUsers: Number(nUser._fieldsProto.nUsers.integerValue) + 1 });
    await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_ROLE)
      .doc(user.uid)
      .set({ role: [process.env.ROLE_USER] });
  });
