const { clientRPC } = require('./config');

const validateAddress = (address) => new Promise((resolve, reject) => {
  clientRPC.callRpc('validateaddress', [address]).call()
    .then(({ isvalid }) => {
      resolve(isvalid);
    })
    .catch((err) => {
      reject(err);
    });
});

const validateIp = (ip) => {
  if (RegExp(/^(25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])(.(25[0-5]|2[0-4][0-9]|[01]?[0-9]?[0-9])){3}$/).test(ip) !== true) return false;
  return true;
};

const checkDataMN = (address) => {
  if (RegExp(/-0|-1/).test(address.txId) !== true) return false;
  validateAddress(address.address).then((valid) => valid === true);
  return !!(address.name && address.privateKey);
};

const checkBodyEmpty = (body) => Object.keys(body).length === 0;

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
  validateIp,
};
