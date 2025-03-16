const CryptoJS = require('crypto-js')

const encryptAes = (data, key) => {
  const encryptedMessage = CryptoJS.AES.encrypt(data.toString('hex'), key)
  return encryptedMessage.toString()
}

const decryptAes = (data, key) => {
  const decryptedBytes = CryptoJS.AES.decrypt(data, key)
  return decryptedBytes.toString(CryptoJS.enc.Utf8)
}

module.exports = {
  encryptAes,
  decryptAes,
}
