const { SyscoinRpcClient } = require('@syscoin/syscoin-js')
const { rpcServices } = require('@syscoin/syscoin-js')
const firebase = require('firebase/app')
const admin = require('firebase-admin')
const csp = require('content-security-policy')
const fs = require('fs')
const serviceAccount = require('../.firebase-service-account.json')
/** Firebase app initialization * */
const firebaseApp = firebase.initializeApp({
  apiKey: process.env.FIREBASE_KEY,
  authDomain: process.env.FIREBASE_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_SENDER_ID,
})

/** Firebase admin initialization * */
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const nodeConfig = {
  host: process.env.NODE_SYSCOIN_HOST_RPC,
  rpcPort: process.env.NODE_SYSCOIN_PORT_RPC,
  username: process.env.NODE_SYSCOIN_USERNAME_RPC,
  password: process.env.NODE_SYSCOIN_PASSWORD_RPC,
  // logLevel: process.env.NODE_SYSCOIN_LOG_LEVEL_RPC,
}

const clientRPC = new SyscoinRpcClient(nodeConfig)

const certificate = {
  key: fs.readFileSync(
    process.env.NODE_ENV === 'prod'
      ? process.env.SSL_KEY_ROUTE
      : './certificates/old/private.key'
  ),
  cert: fs.readFileSync(
    process.env.NODE_ENV === 'prod'
      ? process.env.SSL_CRT_ROUTE
      : './certificates/old/certificate.crt'
  ),
  // ca: fs.readFileSync('./certificates/old/ca_bundle.crt')
}

const cspPolicy = {
  'report-uri': '/reporting',
  'default-src': csp.SRC_NONE,
  'script-src': [csp.SRC_SELF, csp.SRC_DATA],
}

const globalCSP = csp.getCSP(csp.STARTER_OPTIONS)
const localCSP = csp.getCSP(cspPolicy)

module.exports = {
  clientRPC,
  rpcServices,
  firebase,
  firebaseApp,
  admin,
  globalCSP,
  localCSP,
  certificate,
}
