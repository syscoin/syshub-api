const SyscoinRpcClient = require("@syscoin/syscoin-js").SyscoinRpcClient;
const rpcServices = require("@syscoin/syscoin-js").rpcServices;
const firebase = require('firebase');
const admin = require("firebase-admin");
const serviceAccount = require("../keys/syshub-dev-firebase-adminsdk-jyxu8-e6a9b2a618.json");
const fs = require('fs');
const csp = require('content-security-policy');

/** Firebase app initialization **/
firebase.initializeApp({
  apiKey: process.env.FIREBASE_KEY,
  authDomain: process.env.FIREBASE_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_SENDER_ID
})

/** Firebase admin initialization **/
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://syshub-dev.firebaseio.com"
});

const nodeConfig = {
  host: process.env.NODE_ENV !== 'dev' ? process.env.NODE_SYSCOIN_HOST_RPC : '127.0.0.1',
  rpcPort: process.env.NODE_SYSCOIN_PORT_RPC,
  username: process.env.NODE_SYSCOIN_USERNAME_RPC,
  password: process.env.NODE_SYSCOIN_PASSWORD_RPC,
  logLevel: process.env.NODE_SYSCOIN_LOG_LEVEL_RPC
}

const clientRPC = new SyscoinRpcClient(nodeConfig);


const certificate = {
  key: fs.readFileSync('./certificates/old/private.key'),
  cert: fs.readFileSync('./certificates/old/certificate.crt'),
  ca: fs.readFileSync('./certificates/old/ca_bundle.crt')
};

const cspPolicy = {
  'report-uri': '/reporting',
  'default-src': csp.SRC_NONE,
  'script-src': [csp.SRC_SELF, csp.SRC_DATA]
};

const globalCSP = csp.getCSP(csp.STARTER_OPTIONS);
const localCSP = csp.getCSP(cspPolicy);

module.exports = {
  clientRPC,
  rpcServices,
  firebase,
  admin,
  certificate,
  globalCSP,
  localCSP
}