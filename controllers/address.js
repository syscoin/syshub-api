const { checkBodyEmpty, checkDataMN } = require('../utils/helpers');
const { clientRPC, admin } = require('../utils/config');
const { encryptAes, decryptAes } = require('../utils/encrypt');

/**
 * @function
 * @name getAllMasterNodesByUser
 * @desc get all Voting Address per user and their voting information
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.user is an opaque identifier for a user account obtained from the token.
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 *
 */

// eslint-disable-next-line consistent-return
const getAllVotingAddressByUser = async (req, res, next) => {
  try {
    const { hash } = req.query;
    const nodes = [];
    const votesResponse = {};
    const votesArr = [];
    const rdata = {};

    const user = await admin.firestore()
      .collection(process.env.COLLECTION_NAME_USERS)
      .doc(req.user)
      .get();

    // eslint-disable-next-line no-underscore-dangle
    if (typeof user._fieldsProto === 'undefined') {
      return res.status(406).json({
        ok: false,
        message: 'non-existent user',
      });
    }
    if (user.id !== req.user) {
      return res.status(406).json({
        ok: false,
        message: 'you do not have permissions to perform this action',
      });
    }

    if (typeof hash !== 'undefined') {
      const votesData = await clientRPC
        .callRpc('gobject_getcurrentvotes', [hash])
        .call()
        .catch((err) => {
          throw err;
        });

      // eslint-disable-next-line no-restricted-syntax
      for (const key in votesData) {
        // eslint-disable-next-line no-prototype-builtins
        if (votesData.hasOwnProperty(key)) {
          const data = {
            txId: null,
            timestamp: null,
            vote: null,
            funding: null,
          };

          // eslint-disable-next-line array-callback-return
          Object.keys(data).map((k, i) => {
            data[k] = votesData[key].split(':')[i];
          });

          votesArr.push(votesResponse[key] = data);
        }
      }
    }

    // eslint-disable-next-line no-underscore-dangle
    if (user._fieldsProto.mNodeList) {
      // eslint-disable-next-line no-underscore-dangle
      await Promise.all(user._fieldsProto.mNodeList.arrayValue.values.map(async (node) => {
        // eslint-disable-next-line max-len
        const n = await admin.firestore().collection(process.env.COLLECTION_NAME_ADDRESS).doc(node.stringValue).get();
        const data = {};
        data.uid = node.stringValue;
        // eslint-disable-next-line no-restricted-syntax,no-underscore-dangle
        for (const key in n._fieldsProto) {
          // eslint-disable-next-line no-prototype-builtins,no-underscore-dangle
          if (n._fieldsProto.hasOwnProperty(key)) {
            //   if (key === 'proposalVotes') {
            //     const hashVotes = [];
            //     n._fieldsProto[key].arrayValue.values.map((hash) => {
            //       const responseHash = {};
            //       for (const key in hash.mapValue.fields) {
            //         responseHash[key] = decryptAes(hash.mapValue.fields[key].stringValue, process.env.KEY_FOR_ENCRYPTION);
            //       }
            //       hashVotes.push(responseHash);
            //     });
            //     data[key] = hashVotes;
            //
            //   } else
            // eslint-disable-next-line no-underscore-dangle
            if (!n._fieldsProto[key].timestampValue) {
              // eslint-disable-next-line no-underscore-dangle
              data[key] = decryptAes(n._fieldsProto[key].stringValue, process.env.KEY_FOR_ENCRYPTION);
            } else {
              // eslint-disable-next-line no-underscore-dangle
              data[key] = Number(n._fieldsProto[key].timestampValue.seconds);
            }
          }
        }
        nodes.push(data);
      })).catch((err) => {
        throw err;
      });

      if (hash !== 'undefined') {
        const votesFiltered = votesArr
          .filter((v) => nodes.find((e) => e.txId === v.txId))
          .reduce((acc, item) => {
            if (!acc[item.txId]) {
              acc[item.txId] = [];
            }
            acc[item.txId].push(item);
            return acc;
          }, {});

        // eslint-disable-next-line no-restricted-syntax
        for (const votesFilteredKey in votesFiltered) {
          // eslint-disable-next-line no-prototype-builtins
          if (votesFiltered.hasOwnProperty(votesFilteredKey)) {
            rdata[votesFilteredKey] = votesFiltered[votesFilteredKey].find((el) => Math.max(Number(el.timestamp)));
          }
        }
        // eslint-disable-next-line array-callback-return
        nodes.map((e) => {
          // eslint-disable-next-line guard-for-in,no-restricted-syntax
          for (const y in rdata) {
            rdata[y].hash = hash;
            if (e.txId === y) {
              if (rdata[y].vote === 'yes') {
                rdata[y].vote = '1';
              } else if (rdata[y].vote === 'no') {
                rdata[y].vote = '2';
              } else if (rdata[y].vote === 'abstain') {
                rdata[y].vote = '3';
              }
              e.proposalVotes = [{ ...rdata[y] }];
            }
          }
          return e;
        });
      }

      nodes.sort((x, y) => x.date - y.date);

      return res.status(200).json({ ok: true, nodes: nodes.reverse() });
    }
    return res.status(204).json({ ok: false, message: 'There are no associated Voting Address' });
  } catch (err) {
    next(err);
  }
};

/**
 * @function
 * @name getMasterNode
 * @desc get data from a masterNode
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.params.id uid of the masterNode saved in the firebase collection
 * @param {string} req.user is an opaque identifier for a user account obtained from the token.
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 *
 */

// eslint-disable-next-line consistent-return
const getVotingAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    let existMasterNodeInUser;
    const decryptData = {};

    const user = await admin.firestore()
      .collection(process.env.COLLECTION_NAME_USERS)
      .doc(req.user)
      .get()
      .catch((err) => {
        throw err;
      });

    // eslint-disable-next-line no-underscore-dangle
    if (typeof user._fieldsProto === 'undefined') {
      return res.status(406).json({
        ok: false,
        message: 'non-existent user',
      });
    }
    if (user.id !== req.user) {
      return res.status(406).json({
        ok: false,
        message: 'you do not have permissions to perform this action',
      });
    }
    // eslint-disable-next-line no-underscore-dangle,max-len
    if (typeof user._fieldsProto.mNodeList !== 'undefined' && user._fieldsProto.mNodeList.arrayValue.values.length > 0) {
      // eslint-disable-next-line no-underscore-dangle
      if (typeof user._fieldsProto.mNodeList.arrayValue.values.find((e) => e.stringValue === id) === 'undefined') {
        return res.status(406).json({
          ok: false,
          message: 'you do not have permissions to perform this action',
        });
      }

      // eslint-disable-next-line no-underscore-dangle,max-len
      existMasterNodeInUser = user._fieldsProto.mNodeList.arrayValue.values.find((element) => element.stringValue === id);

      if (typeof existMasterNodeInUser !== 'undefined') {
        const { _fieldsProto } = await admin.firestore()
          .collection(process.env.COLLECTION_NAME_ADDRESS)
          .doc(id)
          .get()
          .catch((err) => {
            throw err;
          });

        // eslint-disable-next-line no-restricted-syntax
        for (const key in _fieldsProto) {
          // eslint-disable-next-line no-prototype-builtins
          if (_fieldsProto.hasOwnProperty(key)) {
            if (key !== 'date') {
              decryptData[key] = decryptAes(_fieldsProto[key].stringValue, process.env.KEY_FOR_ENCRYPTION);
            } else if (key === 'date') {
              decryptData[key] = Number(_fieldsProto[key].timestampValue.seconds);
            } else {
              decryptData[key] = _fieldsProto[key].timestampValue.seconds;
            }
          }
        }

        return res.status(200).json({ ok: true, ndNode: decryptData });
      }
      return res.status(204).json({ ok: true, message: 'Unknown Voting Address' });
    }
    return res.status(204).json({ ok: true, message: 'It does not have associated Voting Address' });
  } catch (err) {
    next(err);
  }
};

/**
 * @function
 * @name createMasterNode
 * @desc create a new masterNode
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.user is an opaque identifier for a user account obtained from the token.
 * @param {object} req.body.name name or ip
 * @param {object} req.body.address
 * @param {object} req.body.privateKey
 * @param {object} req.body.txId Fee transaction ID
 * @param {object} req.body.listMN masterNode list from masternode.conf - Not available in version 4.2
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 *
 */
// eslint-disable-next-line consistent-return
const createVotingAddress = async (req, res, next) => {
  try {
    if (checkBodyEmpty(req.body)) {
      return res.status(406).json({ ok: false, message: 'Required fields' });
    }

    const {
      name,
      address,
      privateKey,
      txId,
      listMN,
    } = req.body;

    const addresses = [];
    const addressesInvalid = [];

    const { _fieldsProto: user, _fieldsProto: { addressesList } } = await admin.firestore()
      .collection(process.env.COLLECTION_NAME_USERS)
      .doc(req.user)
      .get()
      .catch((err) => {
        throw err;
      });

    if (typeof user === 'undefined') {
      return res.status(406).json({
        ok: false,
        message: 'non-existent user',
      });
    }

    if (addressesList) {
      const { arrayValue: { values: addrValues } } = addressesList;
      addrValues.forEach((addr) => {
        addresses.push(addr.stringValue);
      });
    }

    if (!listMN) {
      if (!name || !address || !privateKey || !txId) {
        return res.status(406).json({
          ok: false,
          message: 'Required fields',
        });
      }

      const newAddress = {
        name: `${name}`.trim(),
        address: `${address}`.trim(),
        privateKey: `${privateKey}`.trim(),
        txId: `${txId}`.trim(),
      };

      if (checkDataMN(newAddress) !== true) {
        return res.status(406).json({ ok: false, message: 'invalid data, please check your data.' });
      }

      Object.keys(newAddress).forEach((key) => {
        newAddress[key] = encryptAes(newAddress[key], process.env.KEY_FOR_ENCRYPTION);
      });

      newAddress.date = admin.firestore.Timestamp.now();

      const { _path: { id } } = await admin.firestore()
        .collection(process.env.COLLECTION_NAME_ADDRESS)
        .add(newAddress)
        .catch((err) => {
          throw err;
        });

      addresses.push(id);
    } else {
      await Promise.all(JSON.parse(listMN).map(async (data) => {
        const {
          label, votingAddress, votingKey, collateralHash, collateralIndex,
        } = data;
        const newVotingAddress = {
          name: `${label}`.trim(),
          address: `${votingAddress}`.trim(),
          privateKey: `${votingKey}`.trim(),
          txId: `${collateralHash}-${collateralIndex}`.trim(),
        };
        if (checkDataMN(newVotingAddress) === true) {
          Object.keys(newVotingAddress).forEach((key) => {
            newVotingAddress[key] = encryptAes(newVotingAddress[key], process.env.KEY_FOR_ENCRYPTION);
          });
          newVotingAddress.date = admin.firestore.Timestamp.now();
          const { _path: { id } } = await admin.firestore()
            .collection(process.env.COLLECTION_NAME_ADDRESS)
            .add(newVotingAddress)
            .catch((err) => {
              throw err;
            });
          addresses.push(id);
        } else {
          addressesInvalid.push(newVotingAddress);
        }
      })).catch((err) => {
        throw err;
      });
    }

    await admin.firestore()
      .doc(`${process.env.COLLECTION_NAME_USERS}/${req.user}`)
      .update('addressesList', addresses).catch((err) => {
        throw err;
      });
    return res.status(200).json({ ok: true, messages: 'data saved successfully', addressesInvalid });
  } catch (err) {
    next(err);
  }
};

/**
 * @function
 * @name updateMaterNode
 * @desc update data from a masterNode - Voting Address
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.params.id uid of the masterNode saved in the firebase collection
 * @param {string} req.user is an opaque identifier for a user account obtained from the token.
 * @param {object} req.body.data data obtained from the front for update
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */
// eslint-disable-next-line consistent-return
const updateVotingAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data } = req.body;
    const dataEncrypt = {};
    const user = await admin.firestore().collection(process.env.COLLECTION_NAME_USERS).doc(req.user).get();
    // eslint-disable-next-line no-underscore-dangle
    if (typeof user._fieldsProto === 'undefined') {
      return res.status(406).json({
        ok: false,
        message: 'non-existent user',
      });
    }
    // eslint-disable-next-line no-underscore-dangle
    if (typeof user._fieldsProto.mNodeList.arrayValue.values.find((e) => e.stringValue === id) === 'undefined') {
      return res.status(406).json({
        ok: false,
        message: 'you do not have permissions to perform this action',
      });
    }
    // if (user.id !== req.user) return res.status(406).json({ok: false, message: 'you do not have permissions to perform this action'})
    if (!data) return res.status(406).json({ ok: false, message: 'Required fields' });
    if (!checkMN(data)) return res.status(406).json({ ok: false, messasge: 'invalid MasterNode' });
    // eslint-disable-next-line guard-for-in,no-restricted-syntax
    for (const key in data) {
      dataEncrypt[key] = encryptAes(data[key], process.env.KEY_FOR_ENCRYPTION);
    }
    await admin.firestore()
      .doc(`${process.env.COLLECTION_NAME_ADDRESS}/${id}`)
      .update(dataEncrypt)
      .catch((err) => {
        throw err;
      });
    return res.status(200).json({ ok: true, message: 'Voting Address Updated' });
  } catch (err) {
    next(err);
  }
};

/**
 * @function
 * @name destroyMasterNode
 * @desc remove a address from db
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.params.id is an opaque identifier for a user account.
 * @param {string} req.user is an opaque identifier for a user account obtained from the token.
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */
// eslint-disable-next-line consistent-return
const destroyVotingAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const nodes = [];
    let existMasterNodeInUser;
    const user = await admin.firestore().collection(process.env.COLLECTION_NAME_USERS).doc(req.user).get();
    // eslint-disable-next-line no-underscore-dangle
    if (typeof user._fieldsProto === 'undefined') {
      return res.status(406).json({
        ok: false,
        message: 'non-existent user',
      });
    }
    if (user.id !== req.user) {
      return res.status(406).json({
        ok: false,
        message: 'you do not have permissions to perform this action',
      });
    }
    // eslint-disable-next-line no-underscore-dangle
    if (user._fieldsProto.mNodeList.arrayValue.values.length > 0) {
      // eslint-disable-next-line no-underscore-dangle,max-len
      existMasterNodeInUser = user._fieldsProto.mNodeList.arrayValue.values.find((element) => element.stringValue === id);
      if (typeof existMasterNodeInUser !== 'undefined') {
        // eslint-disable-next-line no-underscore-dangle,array-callback-return
        user._fieldsProto.mNodeList.arrayValue.values.map((node) => {
          nodes.push(node.stringValue);
        });
        const index = nodes.findIndex((element) => element === existMasterNodeInUser.stringValue);
        nodes.splice(index, 1);
        // eslint-disable-next-line max-len
        await admin.firestore().doc(`${process.env.COLLECTION_NAME_USERS}/${req.user}`).update('mNodeList', nodes).catch((err) => {
          throw err;
        });
        await admin.firestore().doc(`${process.env.COLLECTION_NAME_ADDRESS}/${id}`).delete().catch((err) => {
          throw err;
        });
        // eslint-disable-next-line no-shadow,max-len
        const info = await admin.firestore().collection(process.env.COLLECTION_NAME_INFO).doc(process.env.COLLECTION_INFO_UID).get();
        // eslint-disable-next-line no-underscore-dangle,max-len
        await admin.firestore().collection(process.env.COLLECTION_NAME_INFO).doc(process.env.COLLECTION_INFO_UID).update({ nMnodes: Number(info._fieldsProto.nMnodes.integerValue) - 1 });
        return res.status(200).json({ ok: true, message: 'Voting Address Deleted' });
      }
      return res.status(204).json({ ok: true, message: 'Voting Address Deleted' });
    }
    return res.status(204).json({ ok: true, message: 'It does not have associated Masternodes' });
  } catch (err) {
    next(err);
  }
};

// eslint-disable-next-line consistent-return
// const masterNodeVoteIn = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const { hash, mnTxId, votingOption } = req.body;
//     const proposalVotes = [];
//     const votesResponse = {};
//     const votesArr = [];
//     const user = await admin.firestore().collection(process.env.COLLECTION_NAME_USERS).doc(req.user).get();
//     if (typeof user._fieldsProto === 'undefined') {
//       return res.status(406).json({
//         ok: false,
//         message: 'non-existent user',
//       });
//     }
//     if (user.id !== req.user) {
//       return res.status(406).json({
//         ok: false,
//         message: 'you do not have permissions to perform this action',
//       });
//     }
//     if (user._fieldsProto.mNodeList || user._fieldsProto.mNodeList.arrayValue.values.length > 0) {
//       const verifyMNInUser = user._fieldsProto.mNodeList.arrayValue.values.find((mn) => mn.stringValue === id);
//       if (typeof verifyMNInUser === 'undefined') {
//         return res.status(406).json({
//           ok: false,
//           message: 'masternode not found',
//         });
//       }
//     }
//     const mn = await admin.firestore().collection(process.env.COLLECTION_NAME_ADDRESS).doc(id).get()
//       .catch((err) => {
//         throw err;
//       });
//     if (typeof mn._fieldsProto === 'undefined') {
//       return res.status(204).json({
//         ok: false,
//         message: 'MasterNode does not exist',
//       });
//     }
//
//     const votesData = await clientRPC.callRpc('gobject', ['getvotes', hash]).call().catch((err) => {
//       throw err;
//     });
//
//     for (const key in votesData) {
//       const data = {
//         txId: null,
//         timestamp: null,
//         vote: null,
//         funding: null,
//       };
//       Object.keys(data).map((k, i) => {
//         data[k] = votesData[key].split(':')[i];
//       });
//
//       votesArr.push(votesResponse[key] = data);
//     }
//
//     const votesFiltered = votesArr
//       .filter((v) => mnTxId.find((e) => e === v.txId))
//       .reduce((acc, item) => {
//         if (!acc[item.txId]) {
//           acc[item.txId] = [];
//         }
//         acc[item.txId].push(item);
//         return acc;
//       }, {});
//     const rdata = {};
//     for (const votesFilteredKey in votesFiltered) {
//       rdata[votesFilteredKey] = votesFiltered[votesFilteredKey].find((el) => Math.max(Number(el.timestamp)));
//     }
//
//     if (Object.keys(rdata).length > 0) {
//       console.log(Object.keys(rdata)[0]);
// if (!mn._fieldsProto.proposalVotes) {
//     console.log(Object.keys(rdata)[0])
//     // proposalVotes.push({hash: encryptAes(hash, process.env.KEY_FOR_ENCRYPTION), votingOption: encryptAes(, process.env.KEY_FOR_ENCRYPTION)})
//   }
// }
// if (votesFiltered.length > 0) {
//   console.log(votesFiltered)
//   // if (!mn._fieldsProto.proposalVotes) {
//   //
//   //   console.log(votesFiltered[0].vote)
//   //   // proposalVotes.push({hash: encryptAes(hash, process.env.KEY_FOR_ENCRYPTION), votingOption: encryptAes(, process.env.KEY_FOR_ENCRYPTION)})
//   // }
// } else {
//
// }
// if (!mn._fieldsProto.proposalVotes) {
//   proposalVotes.push({hash: encryptAes(hash, process.env.KEY_FOR_ENCRYPTION), votingOption: encryptAes(votingOption, process.env.KEY_FOR_ENCRYPTION)})
// } else {
//   if (mn._fieldsProto.proposalVotes.arrayValue.values.length > 0) {
//     let e = mn._fieldsProto.proposalVotes.arrayValue.values.find(elem => hash === decryptAes(elem.mapValue.fields['hash'].stringValue, process.env.KEY_FOR_ENCRYPTION))
//     mn._fieldsProto.proposalVotes.arrayValue.values.map(elem => {
//       let restoreDate = {}
//       for (const key in elem.mapValue.fields) {
//         if (hash !== decryptAes(elem.mapValue.fields['hash'].stringValue, process.env.KEY_FOR_ENCRYPTION)) {
//           restoreDate[key] = elem.mapValue.fields[key].stringValue
//         } else {
//           restoreDate['hash'] = elem.mapValue.fields['hash'].stringValue
//           restoreDate['votingOption'] = encryptAes(votingOption, process.env.KEY_FOR_ENCRYPTION)
//         }
//       }
//       proposalVotes.push(restoreDate)
//     })
//     if (typeof e === "undefined") {
//       proposalVotes.push({hash: encryptAes(hash, process.env.KEY_FOR_ENCRYPTION), votingOption: encryptAes(votingOption, process.env.KEY_FOR_ENCRYPTION)})
//     }
//   } else {
//     proposalVotes.push({hash: encryptAes(hash, process.env.KEY_FOR_ENCRYPTION), votingOption: encryptAes(votingOption, process.env.KEY_FOR_ENCRYPTION)})
//   }
// }
// await admin.firestore().collection(process.env.COLLECTION_NAME_ADDRESS).doc(id).update({proposalVotes: proposalVotes}).catch(err => {
//   throw err
// })
// res.send(rdata);
// return res.status(200).json({ok: true, message: 'saved'})
//   } catch (err) {
//     console.log(err);
//     next(err);
//   }
// };

module.exports = {
  getAllVotingAddressByUser,
  getVotingAddress,
  createVotingAddress,
  updateVotingAddress,
  destroyVotingAddress,
};
