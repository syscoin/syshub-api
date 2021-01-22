const { clientRPC } = require('./config');

const checkDataMN = (mn) => {
  if (RegExp(/-0|-1/).test(mn.txId) !== true) {
    return false;
  }
  if (mn.name && mn.privateKey) {
    return true;
  }
  return false;
};

const checkBodyEmpty = (body) => Object.keys(body).length === 0;

// TODO test validation for necessary controllers in address
const validateAddress = (address) => new Promise((resolve, reject) => {
  clientRPC.callRpc('validateaddress', [address]).call()
    .then((res) => {
      resolve(res);
    })
    .catch((err) => {
      reject(err);
    });
});

const componentToHex = (c) => {
  const hex = c.toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
};

const rgbToHex = (r, g, b) => `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;

module.exports = {
  validateAddress,
  checkDataMN,
  checkBodyEmpty,
  componentToHex,
  rgbToHex,
};
