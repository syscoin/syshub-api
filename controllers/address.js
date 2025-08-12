const crypto = require('crypto')
const {
  checkBodyEmpty,
  checkDataMN,
  validateAddress,
} = require('../utils/helpers')
const { clientRPC, admin } = require('../utils/config')
const { encryptAes, decryptAes } = require('../utils/encrypt')
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
 * @param {string} req.query.hash hash of the vote search proposal
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 *
 */

// eslint-disable-next-line consistent-return
const getAllVotingAddressByUser = async (req, res, next) => {
  try {
    const { hash } = req.query
    const addresses = []
    const votesResponse = {}
    const votesArr = []
    const rdata = {}

    const {
      _fieldsProto: user,
      id,
      _fieldsProto: { addressesList },
    } = await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_USERS)
      .doc(req.user)
      .get()
      .catch((err) => {
        throw err
      })

    if (typeof user === 'undefined') {
      return res.status(406).json({
        ok: false,
        message: 'non-existent user',
      })
    }

    if (id !== req.user) {
      return res.status(403).json({
        ok: false,
        message: 'you do not have permissions to perform this action',
      })
    }

    if (typeof hash !== 'undefined') {
      const votesData = await clientRPC
        .callRpc('gobject_getcurrentvotes', [hash])
        .call()
        .catch((err) => {
          throw err
        })

      Object.keys(votesData).forEach((key) => {
        const data = {
          txId: null,
          timestamp: null,
          vote: null,
          funding: null,
        }

        Object.keys(data).forEach((k, i) => {
          data[k] = votesData[key].split(':')[i]
        })

        votesArr.push((votesResponse[key] = data))
      })
    }

    if (addressesList) {
      const {
        arrayValue: { values },
      } = addressesList
      await Promise.all(
        values.map(async ({ stringValue }) => {
          const { _fieldsProto: addrValue } = await admin
            .firestore()
            .collection(process.env.COLLECTION_NAME_ADDRESS)
            .doc(stringValue)
            .get()
            .catch((err) => {
              throw err
            })
          const data = {}
          data.uid = stringValue
          Object.keys(addrValue).forEach((key) => {
            if (!addrValue[key].timestampValue) {
              data[key] = decryptAes(
                addrValue[key].stringValue,
                process.env.KEY_FOR_ENCRYPTION
              )
            } else {
              data[key] = Number(addrValue[key].timestampValue.nanos)
            }
          })
          addresses.push(data)
        })
      ).catch((err) => {
        throw err
      })

      if (hash !== 'undefined') {
        const votesFiltered = votesArr
          .filter((v) => addresses.find((e) => e.txId === v.txId))
          .reduce((acc, item) => {
            if (!acc[item.txId]) {
              acc[item.txId] = []
            }
            acc[item.txId].push(item)
            return acc
          }, {})

        Object.keys(votesFiltered).forEach((key) => {
          rdata[key] = votesFiltered[key].find((el) =>
            Math.max(Number(el.timestamp))
          )
        })

        addresses.forEach((e) => {
          Object.keys(rdata).forEach((v) => {
            rdata[v].hash = hash
            if (e.txId === v) {
              if (rdata[v].vote === 'yes') {
                rdata[v].vote = '1'
              } else if (rdata[v].vote === 'no') {
                rdata[v].vote = '2'
              } else if (rdata[v].vote === 'abstain') {
                rdata[v].vote = '3'
              }
              e.proposalVotes = [{ ...rdata[v] }]
            }
            return e
          })
        })
      }

      addresses.sort((x, y) => x.date - y.date)

      return res.status(200).json({ ok: true, nodes: addresses.reverse() })
    }
    return res
      .status(204)
      .json({ ok: false, message: 'There are no associated Voting Address' })
  } catch (err) {
    next(err)
  }
}

/**
 * @function
 * @name getVotingAddress
 * @desc get data from a voting address
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
    const { id } = req.params
    let existMasterNodeInUser
    const decryptData = {}

    const {
      _fieldsProto: user,
      _fieldsProto: { addressesList },
    } = await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_USERS)
      .doc(req.user)
      .get()
      .catch((err) => {
        throw err
      })

    if (typeof user === 'undefined') {
      return res.status(406).json({
        ok: false,
        message: 'non-existent user',
      })
    }

    if (
      typeof addressesList !== 'undefined' &&
      addressesList.arrayValue.values.length > 0
    ) {
      if (
        typeof addressesList.arrayValue.values.find(
          (e) => e.stringValue === id
        ) === 'undefined'
      ) {
        return res.status(403).json({
          ok: false,
          message: 'you do not have permissions to perform this action',
        })
      }

      existMasterNodeInUser = addressesList.arrayValue.values.find(
        (element) => element.stringValue === id
      )

      if (typeof existMasterNodeInUser !== 'undefined') {
        const { _fieldsProto: fieldsProto } = await admin
          .firestore()
          .collection(process.env.COLLECTION_NAME_ADDRESS)
          .doc(id)
          .get()
          .catch((err) => {
            throw err
          })

        Object.keys(fieldsProto).forEach((key) => {
          if (key !== 'date') {
            decryptData[key] = decryptAes(
              fieldsProto[key].stringValue,
              process.env.KEY_FOR_ENCRYPTION
            )
          } else if (key === 'date') {
            decryptData[key] = Number(fieldsProto[key].timestampValue.seconds)
          } else {
            decryptData[key] = fieldsProto[key].timestampValue.seconds
          }
        })

        return res.status(200).json({ ok: true, ndNode: decryptData })
      }
      return res
        .status(204)
        .json({ ok: true, message: 'Unknown Voting Address' })
    }
    return res
      .status(204)
      .json({ ok: true, message: 'It does not have associated Voting Address' })
  } catch (err) {
    next(err)
  }
}

/**
 * @function
 * @name createVotingAddress
 * @desc create a new voting address
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.user is an opaque identifier for a user account obtained from the token.
 * @param {object} req.body.name name or ip
 * @param {object} req.body.address
 * @param {object} req.body.privateKey
 * @param {object} req.body.txId collateralHash and collateralIndex
 * @param {object} req.body.listMN masterNode list from masternode.conf - Not available in version 4.2, use protx_list_wallet 1 in console the Syscoin-qt
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 *
 */
// eslint-disable-next-line consistent-return
const createVotingAddress = async (req, res, next) => {
  try {
    if (checkBodyEmpty(req.body)) {
      return res.status(406).json({ ok: false, message: 'Required fields' })
    }

    const { name, address, privateKey, txId, listMN, type } = req.body

    const re = /['"]+/g
    let serializedArray = []
    const addresses = []
    const addressesInvalid = []
    const aggregateAddresses = []
    const {
      _fieldsProto: user,
      _fieldsProto: { addressesList },
    } = await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_USERS)
      .doc(req.user)
      .get()
      .catch((err) => {
        throw err
      })

    if (typeof user === 'undefined') {
      return res.status(406).json({
        ok: false,
        message: 'non-existent user',
      })
    }

    const currentMN = await clientRPC
      .callRpc('masternode_list')
      .call()
      .catch((err) => {
        throw err
      })

    // eslint-disable-next-line max-len
    const votingAddressCurrentMns = Object.keys(currentMN).reduce(
      (acc, el) => acc.concat(currentMN[el].votingaddress),
      []
    )

    if (addressesList) {
      const {
        arrayValue: { values: addrValues },
      } = addressesList
      addrValues.forEach((addr) => {
        addresses.push(addr.stringValue)
      })
    }

    if (!listMN) {
      if (!name || !address || !privateKey || !txId) {
        return res.status(406).json({
          ok: false,
          message: 'Required fields',
        })
      }
    }

    const resp = await Promise.all(
      addresses.map(async (addr) => {
        // eslint-disable-next-line no-shadow
        const {
          _fieldsProto: { name, address: addrUser },
        } = await admin
          .firestore()
          .collection(process.env.COLLECTION_NAME_ADDRESS)
          .doc(addr)
          .get()
          .catch((err) => {
            throw err
          })
        return {
          name: decryptAes(name.stringValue, process.env.KEY_FOR_ENCRYPTION),
          address: decryptAes(
            addrUser.stringValue,
            process.env.KEY_FOR_ENCRYPTION
          ),
        }
      })
    )

    if (!listMN) {
      const newAddress = {
        name: `${name.replace(re, '')}`.trim(),
        address: `${address.replace(re, '')}`.trim(),
        privateKey: `${privateKey.replace(re, '')}`.trim(),
        txId: `${txId.replace(re, '')}`.trim(),
        type,
      }
      const existInMn = votingAddressCurrentMns.find(
        (addr) => addr === newAddress.address
      )
      const isExist = resp.find((e) => e.address === newAddress.address)
      const verifyName = resp.find((e) => e.name === newAddress.name)
      console.debug({ newAddress, isExist, existInMn, verifyName })
      if (typeof verifyName !== 'undefined') {
        newAddress.name =
          `${name.replace(re, '')}-${crypto.randomBytes(12).toString('hex')}`.trim()
      }

      if (typeof isExist === 'undefined' && typeof existInMn !== 'undefined') {
        aggregateAddresses.push(newAddress)
      }
    } else {
      if (Array.isArray(listMN) === false) {
        return res.status(406).json({ ok: false, message: 'invalid format' })
      }
      serializedArray = [...new Set(listMN.map(JSON.stringify))].map(JSON.parse)

      serializedArray.forEach((e) => {
        const {
          label,
          votingAddress,
          votingKey,
          collateralHash,
          collateralIndex,
        } = e

        const newVotingAddress = {
          name: `${label}`.trim(),
          address: `${votingAddress}`.trim(),
          privateKey: `${votingKey}`.trim(),
          txId: `${collateralHash}-${collateralIndex}`.trim(),
        }
        const existInMn = votingAddressCurrentMns.find(
          (addr) => addr === newVotingAddress.address
        )
        const isExist = resp.find(
          (el) => el.address === newVotingAddress.address
        )
        const verifyName = resp.find((el) => el.name === newVotingAddress.name)

        if (typeof verifyName !== 'undefined') {
          newVotingAddress.name =
            `${label.replace(re, '')}-${crypto.randomBytes(12).toString('hex')}`.trim()
        }

        if (aggregateAddresses.length > 0) {
          const verifyNameInAddresses = aggregateAddresses.find(
            (el) => el.name === newVotingAddress.name
          )
          if (typeof verifyNameInAddresses !== 'undefined') {
            newVotingAddress.name =
              `${label.replace(re, '')}-${crypto.randomBytes(12).toString('hex')}`.trim()
          }
        }

        if (
          typeof isExist === 'undefined' &&
          typeof existInMn !== 'undefined'
        ) {
          aggregateAddresses.push(newVotingAddress)
        }
      })
    }

    if (aggregateAddresses.length === 0) {
      return res
        .status(200)
        .json({ ok: true, message: 'There are no new voting addresses to add' })
    }

    await Promise.all(
      aggregateAddresses.map(async (data) => {
        if (checkDataMN(data) === true) {
          Object.keys(data).forEach((key) => {
            // eslint-disable-next-line no-param-reassign
            data[key] = encryptAes(data[key], process.env.KEY_FOR_ENCRYPTION)
          })
          // eslint-disable-next-line no-param-reassign
          data.date = admin.firestore.Timestamp.now()
          const {
            _path: { id },
          } = await admin
            .firestore()
            .collection(process.env.COLLECTION_NAME_ADDRESS)
            .add(data)
            .catch((err) => {
              throw err
            })
          addresses.push(id)
        } else {
          addressesInvalid.push(data)
        }
      })
    ).catch((err) => {
      throw err
    })
    await admin
      .firestore()
      .doc(`${process.env.COLLECTION_NAME_USERS}/${req.user}`)
      .update('addressesList', addresses)
      .catch((err) => {
        throw err
      })

    return res
      .status(200)
      .json({ ok: true, message: 'Data saved successfully', addressesInvalid })
  } catch (err) {
    if (err.message === 'Unexpected end of JSON input') {
      return res.status(406).json({
        ok: false,
        message: 'Invalid format, Please verify the data and try again',
      })
    }
    next(err)
  }
}

/**
 * @function
 * @name updateVotingAddress
 * @desc update data from a masterNode - Voting Address
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.params.id uid of the voting address saved in the firebase collection
 * @param {string} req.user is an opaque identifier for a user account obtained from the token.
 * @param {object} req.body.data data obtained from the front for update
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */
// eslint-disable-next-line consistent-return
const updateVotingAddress = async (req, res, next) => {
  try {
    const { id } = req.params
    const { data } = req.body
    const dataEncrypt = {}
    const re = /['"]+/g
    const { _fieldsProto: fieldsProto } = await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_USERS)
      .doc(req.user)
      .get()
      .catch((err) => {
        throw err
      })
    // eslint-disable-next-line no-underscore-dangle
    if (typeof fieldsProto === 'undefined') {
      return res.status(406).json({
        ok: false,
        message: 'non-existent user',
      })
    }

    if (
      typeof fieldsProto.addressesList.arrayValue.values.find(
        (e) => e.stringValue === id
      ) === 'undefined'
    ) {
      return res.status(403).json({
        ok: false,
        message: 'you do not have permissions to perform this action',
      })
    }

    const addresses = await Promise.all(
      fieldsProto.addressesList.arrayValue.values.map(async (addr) => {
        const {
          _fieldsProto: { name, address: addrUser },
        } = await admin
          .firestore()
          .collection(process.env.COLLECTION_NAME_ADDRESS)
          .doc(addr.stringValue)
          .get()
          .catch((err) => {
            throw err
          })
        return {
          name: decryptAes(name.stringValue, process.env.KEY_FOR_ENCRYPTION),
          address: decryptAes(
            addrUser.stringValue,
            process.env.KEY_FOR_ENCRYPTION
          ),
        }
      })
    )

    // eslint-disable-next-line max-len
    if (
      typeof addresses.find((addrItem) => addrItem.name === data.name) !==
        'undefined' &&
      addresses.filter(
        (addrItem) =>
          addrItem.name === data.name && addrItem.address !== data.address
      ).length > 0
    ) {
      if (!data.name.split('-')[1]) {
        data.name =
          `${data.name.replace(re, '')}-${crypto.randomBytes(12).toString('hex')}`.trim()
      }
    }

    // if (user.id !== req.user) return res.status(406).json({ ok: false, message: 'you do not have permissions to perform this action' });
    if (!data)
      return res.status(406).json({ ok: false, message: 'Required fields' })
    if (!checkDataMN(data))
      return res.status(406).json({ ok: false, messasge: 'invalid MasterNode' })
    const validateAddr = await validateAddress(data.address)
    if (!validateAddr) {
      return res.status(400).json({
        ok: false,
        message: 'invalid address',
      })
    }
    Object.keys(data).forEach((key) => {
      dataEncrypt[key] = encryptAes(data[key], process.env.KEY_FOR_ENCRYPTION)
    })

    await admin
      .firestore()
      .doc(`${process.env.COLLECTION_NAME_ADDRESS}/${id}`)
      .update(dataEncrypt)
      .catch((err) => {
        throw err
      })
    return res.status(200).json({ ok: true, message: 'Voting Address Updated' })
  } catch (err) {
    next(err)
  }
}

/**
 * @function
 * @name destroyVotingAddress
 * @desc remove a address from db
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.params.id uid of the voting address saved in the firebase collection
 * @param {string} req.user is an opaque identifier for a user account obtained from the token.
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */
// eslint-disable-next-line consistent-return
const destroyVotingAddress = async (req, res, next) => {
  try {
    const { id } = req.params
    const addresses = []
    let existMasterNodeInUser
    const { _fieldsProto: fieldsProto, id: uid } = await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_USERS)
      .doc(req.user)
      .get()
      .catch((err) => {
        throw err
      })
    // eslint-disable-next-line no-underscore-dangle
    if (typeof fieldsProto === 'undefined') {
      return res.status(406).json({
        ok: false,
        message: 'non-existent user',
      })
    }
    if (uid !== req.user) {
      return res.status(403).json({
        ok: false,
        message: 'you do not have permissions to perform this action',
      })
    }
    if (fieldsProto.addressesList.arrayValue.values.length > 0) {
      existMasterNodeInUser = fieldsProto.addressesList.arrayValue.values.find(
        (element) => element.stringValue === id
      )
      if (typeof existMasterNodeInUser !== 'undefined') {
        // eslint-disable-next-line array-callback-return
        fieldsProto.addressesList.arrayValue.values.map((node) => {
          addresses.push(node.stringValue)
        })
        const index = addresses.findIndex(
          (element) => element === existMasterNodeInUser.stringValue
        )
        addresses.splice(index, 1)
        await admin
          .firestore()
          .doc(`${process.env.COLLECTION_NAME_USERS}/${req.user}`)
          .update('addressesList', addresses)
          .catch((err) => {
            throw err
          })
        await admin
          .firestore()
          .doc(`${process.env.COLLECTION_NAME_ADDRESS}/${id}`)
          .delete()
          .catch((err) => {
            throw err
          })
        return res
          .status(200)
          .json({ ok: true, message: 'Voting Address Deleted' })
      }
      return res
        .status(204)
        .json({ ok: true, message: 'Voting Address Deleted' })
    }
    return res
      .status(204)
      .json({ ok: true, message: 'It does not have associated Masternodes' })
  } catch (err) {
    next(err)
  }
}

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
}
