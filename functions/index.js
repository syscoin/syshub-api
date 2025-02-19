/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-unresolved */
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();

const COLLECTION_NAME_USERS = functions.config().collection.name_users;
const COLLECTION_NAME_INFO = functions.config().collection.name_info;
const COLLECTION_INFO_UID = functions.config().collection.info_uid;
const COLLECTION_NAME_ROLE = functions.config().collection.name_role;
const ROLE_USER = functions.config().role.user;

console.log("Users Collection:", COLLECTION_NAME_USERS);
console.log("Info Collection:", COLLECTION_NAME_INFO);
console.log("Info UID:", COLLECTION_INFO_UID);
console.log("Role Collection:", COLLECTION_NAME_ROLE);
console.log("Role User:", ROLE_USER);

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
          .collection(COLLECTION_NAME_USERS)
          .doc(user.uid)
          .set(userData);

      const nUser = await admin
          .firestore()
          .collection(COLLECTION_NAME_INFO)
          .doc(COLLECTION_INFO_UID)
          .get();

      const nUsers = Number(nUser._fieldsProto.nUsers.integerValue) + 1;
      await admin
          .firestore()
          .collection(COLLECTION_NAME_INFO)
          .doc(COLLECTION_INFO_UID)
      // eslint-disable-next-line no-underscore-dangle
          .update({ nUsers });
      await admin
          .firestore()
          .collection(COLLECTION_NAME_ROLE)
          .doc(user.uid)
          .set({ role: [ROLE_USER] });
    });
