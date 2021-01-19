const { checkMN, checkBodyEmpty } = require('../utils/helpers');
const { clientRPC, admin } = require('../utils/config');
const { encryptAes, decryptAes } = require('../utils/encrypt');

/**
 * @function
 * @name countMasterNodes
 * @desc prints the number of all known masternodes.
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 * @example
 * {
    "total": 2067,
    "enabled": 1917,
    "qualify": 1870
    }
 */
// eslint-disable-next-line consistent-return
const countMasterNodes = async (req, res, next) => {
  try {
    const nMasterNodes = await clientRPC
      .callRpc('masternode_count')
      .call(true)
      .catch((err) => {
        throw err;
      });
    return res.status(200).json({ ok: true, nMasterNodes });
  } catch (err) {
    next(err);
  }
};

/**
 * @function
 * @name list
 * @desc lists governance objects
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {function} next errors caught and sent
 *
 * @return {array} positive answer
 *
 * @example
 *  {
        "Hash": "16b85f92352efabf32fbdd986c41ccd884f511909db70679e22318f378b7ec7c",
        "ColHash": "0000000000000000000000000000000000000000000000000000000000000000",
        "ObectType": 2,
        "CreationTime": 1606531853,
        "AbsoluteYesCount": 1757,
        "YesCount": 1757,
        "NoCount": 0,
        "AbstainCount": 0,
        "fBlockchainValidity": true,
        "IsValidReason": "",
        "fCachedValid": true,
        "fCachedFunding": true,
        "fCachedDelete": false,
        "fCachedEndorsed": false,
        "event_block_height": 788400,
        "payment_addresses": "sys1qvmhjxn8kaufe0mmf88edy77gcq3c4z4ggm43zc|sys1qnmp9aew5x2djeld2w7m8c97t8a3497d5f4c3yc|sys1q5hjkux3c3ghvxdmhhzw2pdznm8ejwzna9khd9n|sys1qwjs7acmk07xtwgrr36e4dtcvngp7c7ckskd2z3",
        "payment_amounts": "4567.00000000|200000.00000000|235000.00000000|64217.00000000",
        "proposal_hashes": "f4e517aa1039561c4338ce261bbfa463167434a87c212b38006fe217342a55e1|de8c4f42d74dd6934cb0738a289d874f1cd3cfba22b969fddb7409a0c24ed6b1|d629153f5262e0ff896671eaa1860b651a3a3945dee1608c639c52020cc0bf07|0a63e563fe0cde738c8f45facf3d2f82d6370ff3696798381d9a7988e4b2c849",
        "type": 2
    },
 {
        "Hash": "f4e517aa1039561c4338ce261bbfa463167434a87c212b38006fe217342a55e1",
        "ColHash": "1a2439df7f24588845cd1f369b4144d4bc087c0830374ba6f3eef019026f68ba",
        "ObectType": 1,
        "CreationTime": 1606040805,
        "AbsoluteYesCount": 416,
        "YesCount": 468,
        "NoCount": 52,
        "AbstainCount": 0,
        "fBlockchainValidity": true,
        "IsValidReason": "",
        "fCachedValid": true,
        "fCachedFunding": true,
        "fCachedDelete": false,
        "fCachedEndorsed": false,
        "type": 1,
        "name": "extendingsyslinksnov",
        "title": "Extending Syslinks November",
        "description": "",
        "nPayment": 6,
        "first_epoch": 1606040805,
        "start_epoch": 1606040805,
        "end_epoch": 1621679205,
        "payment_address": "sys1qvmhjxn8kaufe0mmf88edy77gcq3c4z4ggm43zc",
        "payment_amount": 4567,
        "url": "https://support.syscoin.org/t/2020-11-12-extending-syslinks/321"
    },
 */
// eslint-disable-next-line consistent-return
const list = async (req, res, next) => {
  try {
    const proposals = [];
    const hiddenProposal = [];
    const proposalResp = [];

    const listProposalsHidden = await admin.firestore()
      .collection(process.env.COLLECTION_PROPOSAL_HIDDEN)
      .get()
      .catch((err) => {
        throw err;
      });

    // eslint-disable-next-line no-underscore-dangle,array-callback-return
    listProposalsHidden._docs().map((doc) => {
      // eslint-disable-next-line no-underscore-dangle
      hiddenProposal.push(doc._fieldsProto.hash.stringValue);
    });

    const gObjectList = await clientRPC
      .callRpc('gobject_list')
      .call()
      .catch((err) => {
        throw err;
      });

    // eslint-disable-next-line no-restricted-syntax
    for (const gObjectListKey in gObjectList) {
      // eslint-disable-next-line no-prototype-builtins
      if (gObjectList.hasOwnProperty(gObjectListKey)) {
        const key = gObjectList[gObjectListKey];
        const bb = !JSON.parse(key.DataString)[0] ? JSON.parse(key.DataString) : JSON.parse(key.DataString)[0][1];
        const { Hash } = key;
        const ColHash = key.CollateralHash;
        const { ObjectType } = key;
        const { CreationTime } = key;
        const { AbsoluteYesCount } = key;
        const { YesCount } = key;
        const { NoCount } = key;
        const { AbstainCount } = key;
        const { fBlockchainValidity } = key;
        const { IsValidReason } = key;
        const { fCachedValid } = key;
        const { fCachedFunding } = key;
        const { fCachedDelete } = key;
        const { fCachedEndorsed } = key;

        const govList = {
          Hash,
          ColHash,
          ObjectType,
          CreationTime,
          AbsoluteYesCount,
          YesCount,
          NoCount,
          AbstainCount,
          fBlockchainValidity,
          IsValidReason,
          fCachedValid,
          fCachedFunding,
          fCachedDelete,
          fCachedEndorsed,
        };

        proposals.push({ ...govList, ...bb });
        proposals.sort((a, b) => ((a.AbsoluteYesCount < b.AbsoluteYesCount) ? 1 : -1));
      }
    }
    // eslint-disable-next-line array-callback-return
    proposals.map((elem) => {
      const hidden = hiddenProposal.find((el) => el === elem.Hash);
      if (typeof hidden === 'undefined') {
        proposalResp.push(elem);
      }
    });

    return res.status(200).json(proposalResp);
  } catch (err) {
    next(err);
  }
};

/**
 * @function
 * @name info
 * @desc provides information about the current state of the block chain.
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {function} next errors caught and sent
 *
 * @return {number} positive answer
 * @example 367.20
 */

// eslint-disable-next-line consistent-return
const info = async (req, res, next) => {
  try {
    // eslint-disable-next-line no-shadow
    const info = await clientRPC
      .callRpc('getblockchaininfo')
      .call(true)
      .catch((err) => {
        throw err;
      });

    return res.status(200).json({ ok: true, BlockChainInfo: info });
  } catch (err) {
    next(err);
  }
};

/**
 * @function
 * @name getMiningInfo
 * @desc returns various mining-related information.
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 *
 * @example
 * {
      "blocks": 292979,
      "currentblocksize": 0,
      "currentblocktx": 0,
      "difficulty": 0.0002441371325370145,
      "networkhashps": 3805.856874962192,
      "pooledtx": 0,
      "chain": "test",
      "warnings": "Warning: unknown new rules activated (versionbit 3)"
    }
 */
// eslint-disable-next-line consistent-return
const getMiningInfo = async (req, res, next) => {
  try {
    // eslint-disable-next-line no-shadow
    const getMiningInfo = await clientRPC
      .callRpc('getmininginfo')
      .call(true)
      .catch((err) => {
        throw err;
      });

    return res.status(200).json(getMiningInfo);
  } catch (err) {
    next(err);
  }
};

/**
 * @function
 * @name getGovernanceInfo
 * @desc returns an object containing governance parameters.
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 *
 * @example
 * {
    "governanceminquorum": 1,
    "proposalfee": 5.00000000,
    "superblockcycle": 24,
    "lastsuperblock": 250824,
    "nextsuperblock": 250848
    }
 */
// eslint-disable-next-line consistent-return
const getGovernanceInfo = async (req, res, next) => {
  try {
    // eslint-disable-next-line no-shadow
    const getGovernanceInfo = await clientRPC
      .callRpc('getgovernanceinfo')
      .call()
      .catch((err) => {
        throw err;
      });
    return res.status(200).json(getGovernanceInfo);
  } catch (err) {
    next(err);
  }
};

/**
 * @function
 * @name getSuperBlockBudget
 * @desc returns the absolute maximum sum of superblock payments allowed.
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {function} next errors caught and sent
 *
 * @return {number} positive answer
 * @example The absolute maximum sum of superblock payments allowed, in SYS
 */

// eslint-disable-next-line consistent-return
const getSuperBlockBudget = async (req, res, next) => {
  try {
    // eslint-disable-next-line no-shadow
    const getGovernanceInfo = await clientRPC
      .callRpc('getgovernanceinfo')
      .call()
      .catch((err) => {
        throw err;
      });

    const { lastsuperblock, nextsuperblock } = getGovernanceInfo;

    const getSuperBlockBudgetLast = await clientRPC
      .callRpc('getsuperblockbudget', [lastsuperblock])
      .call(true)
      .catch((err) => {
        throw err;
      });

    const getSuperBlockBudgetNext = await clientRPC
      .callRpc('getsuperblockbudget', [nextsuperblock])
      .call(true)
      .catch((err) => {
        throw err;
      });

    const lbs = { block: lastsuperblock, budget: getSuperBlockBudgetLast };
    const nbs = { block: nextsuperblock, budget: getSuperBlockBudgetNext };
    return res.status(200).json({ ok: true, lbs, nbs });
  } catch (err) {
    next(err);
  }
};

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
    if (checkBodyEmpty(req.body)) return res.status(406).json({ ok: false, message: 'Required fields' });
    const {
      name, address, privateKey, txId, listMN,
    } = req.body;
    const file = req.files;
    const nodes = [];
    // const accNodes = 0;
    const dataEncrypt = class {
      // eslint-disable-next-line consistent-return,class-methods-use-this
      async encryptMasterNode(mn) {
        const encrypted = {};
        if (checkMN(mn)) {
          // eslint-disable-next-line no-restricted-syntax
          for (const rpcServicesKey in mn) {
            // eslint-disable-next-line no-prototype-builtins
            if (mn.hasOwnProperty(rpcServicesKey)) {
              encrypted[rpcServicesKey] = encryptAes(mn[rpcServicesKey], process.env.KEY_FOR_ENCRYPTION);
              encrypted.date = admin.firestore.Timestamp.now();
            }
          }
          return encrypted;
        }
      }
    };
    const user = await admin.firestore().collection(process.env.COLLECTION_NAME_USERS).doc(req.user).get();
    // eslint-disable-next-line no-underscore-dangle
    if (typeof user._fieldsProto === 'undefined') {
      return res.status(406).json({
        ok: false,
        message: 'non-existent user',
      });
    }
    // eslint-disable-next-line no-underscore-dangle
    if (user._fieldsProto.mNodeList) {
      // eslint-disable-next-line no-underscore-dangle,array-callback-return
      user._fieldsProto.mNodeList.arrayValue.values.map((node) => {
        nodes.push(node.stringValue);
      });
    }
    if (listMN) {
      return res.status(418).json({ ok: false, message: 'it is not possible to process this request' });
      // const lines = listMN.split(/\r*\n/);
      // const commentsRemoved = lines.filter((line) => line[0] !== '#');
      // await Promise.all(commentsRemoved.map(async (mn) => {
      //   const lineArray = mn.split(' ');
      //   if (lineArray.length === 5) {
      //     const newMN = {
      //       name: lineArray[0].trim(),
      //       privateKey: lineArray[2].trim(),
      //       txId: `${lineArray[3].trim()}-${lineArray[4].trim()}`,
      //     };
      //     const encryptedMN = await dataEncrypt.prototype.encryptMasterNode(newMN);
      //     const resp = await admin.firestore().collection(process.env.COLLECTION_NAME_ADDRESS).add(encryptedMN);
      //     nodes.push(resp._path.id);
      //     accNodes = accNodes++;
      //   }
      // }));
      // await admin.firestore().doc(`${process.env.COLLECTION_NAME_USERS}/${req.user}`).update('mNodeList', nodes);
      // const info = await admin.firestore().collection(process.env.COLLECTION_NAME_INFO).doc(process.env.COLLECTION_INFO_UID).get();
      // await admin.firestore().collection(process.env.COLLECTION_NAME_INFO).doc(process.env.COLLECTION_INFO_UID).update({ nMnodes: Number(info._fieldsProto.nMnodes.integerValue) + accNodes });
    }
    if (!listMN) {
      if (!name || !address || !privateKey || !txId) {
        return res.status(406).json({
          ok: false,
          message: 'Required fields',
        });
      }
      const mn = {
        name: name.trim(),
        address: address.trim(),
        privateKey: privateKey.trim(),
        txId: txId.trim(),
      };
      if (!checkMN(mn)) return res.status(406).json({ ok: false, message: 'mn invalid' });
      const encryptedMN = await dataEncrypt.prototype.encryptMasterNode(mn);
      const resp = await admin.firestore()
        .collection(process.env.COLLECTION_NAME_ADDRESS)
        .add(encryptedMN);
      // eslint-disable-next-line no-underscore-dangle
      nodes.push(resp._path.id);
      await admin.firestore()
        .doc(`${process.env.COLLECTION_NAME_USERS}/${req.user}`)
        .update('mNodeList', nodes);
      // eslint-disable-next-line no-shadow
      const info = await admin.firestore()
        .collection(process.env.COLLECTION_NAME_INFO)
        .doc(process.env.COLLECTION_INFO_UID)
        .get();
      await admin.firestore()
        .collection(process.env.COLLECTION_NAME_INFO)
        .doc(process.env.COLLECTION_INFO_UID)
        // eslint-disable-next-line no-underscore-dangle
        .update({ nMnodes: Number(info._fieldsProto.nMnodes.integerValue) + 1 });
    } else if (file) {
      console.log('file');
    }
    return res.status(200).json({ ok: false, message: 'created voting address' });
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
  countMasterNodes,
  list,
  info,
  getMiningInfo,
  getGovernanceInfo,
  getSuperBlockBudget,
  getAllVotingAddressByUser,
  getVotingAddress,
  createVotingAddress,
  updateVotingAddress,
  destroyVotingAddress,
};
