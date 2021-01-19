const checkMN = (mn) => {
  if (RegExp(/-0|-1/).test(mn.txId) !== true) {
    return false;
  }
  if (mn.name && mn.privateKey) {
    return true;
  }
  return false;
};

const checkBodyEmpty = (body) => Object.keys(body).length === 0;

module.exports = {
  checkMN,
  checkBodyEmpty,
};
