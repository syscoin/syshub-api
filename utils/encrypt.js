const CryptoJS = require('crypto-js');

const encryptAes = (data, key) => {
  try {
    let encryptedMessage = CryptoJS.AES.encrypt(data.toString('hex'), key);
    return encryptedMessage.toString();
  } catch (err) {
    throw err;
  }
}

const decryptAes = (data, key) => {
  try {
    let decryptedBytes = CryptoJS.AES.decrypt(data, key);
    return decryptedBytes.toString(CryptoJS.enc.Utf8);
  } catch (err) {
    throw err;
  }
}

module.exports = {
  encryptAes,
  decryptAes
}
