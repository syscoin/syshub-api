const {checkMN, checkBodyEmpty} = require("../utils/helpers");
const {clientRPC, admin} = require('../utils/config');
const {encryptAes, decryptAes} = require('../utils/encrypt');

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
const countMasterNodes = async (req, res, next) => {
    try {

        let nMasterNodes = await clientRPC
            .callRpc("masternode_count")
            .call(true)
            .catch(err => {
                throw err
            })

        return res.status(200).json({ok: true, nMasterNodes})
    } catch (err) {
        next(err)
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
const list = async (req, res, next) => {
    try {
        let proposals = [];
        let hiddenProposal = [];
        let proposalResp = [];

        let listProposalsHidden = await admin.firestore()
            .collection(process.env.COLLECTION_PROPOSAL_HIDDEN)
            .get()
            .catch(err => {
                throw err
            })

        listProposalsHidden._docs().map(doc => {
            hiddenProposal.push(doc._fieldsProto.hash.stringValue)
        })

        let gObjectList = await clientRPC
            .callRpc("gobject_list")
            .call()
            .catch(err => {
                throw err
            })

        for (const gObjectListKey in gObjectList) {
            if (gObjectList.hasOwnProperty(gObjectListKey)) {
                let key = gObjectList[gObjectListKey]
                let bb = JSON.parse(key['DataString']);
                let Hash = key['Hash'];
                let ColHash = key['CollateralHash'];
                let ObjectType = key['ObjectType'];
                let CreationTime = key['CreationTime'];
                let AbsoluteYesCount = key['AbsoluteYesCount'];
                let YesCount = key['YesCount'];
                let NoCount = key['NoCount'];
                let AbstainCount = key['AbstainCount'];
                let fBlockchainValidity = key['fBlockchainValidity'];
                let IsValidReason = key['IsValidReason'];
                let fCachedValid = key['fCachedValid'];
                let fCachedFunding = key['fCachedFunding'];
                let fCachedDelete = key['fCachedDelete'];
                let fCachedEndorsed = key['fCachedEndorsed'];

                let govList = {
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
                    fCachedEndorsed
                }

                proposals.push(Object.assign({}, govList, bb))
                proposals.sort((a, b) => (a.AbsoluteYesCount < b.AbsoluteYesCount) ? 1 : -1)
            }
        }

        proposals.map(elem => {
            let hidden = hiddenProposal.find(el => el === elem.Hash)
            if (typeof hidden === "undefined") {
                proposalResp.push(elem)
            }
        })

        return res.status(200).json(proposalResp)
    } catch (err) {
        console.log(err)
        next(err)
    }
}

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

const info = async (req, res, next) => {
    try {

        let info = await clientRPC
            .callRpc("getblockchaininfo")
            .call(true)
            .catch(err => {
                throw err
            })

        return res.status(200).json({ok: true, BlockChainInfo: info})
    } catch (err) {
        next(err)
    }
}

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
const getMiningInfo = async (req, res, next) => {
    try {

        let getMiningInfo = await clientRPC
            .callRpc("getmininginfo")
            .call(true)
            .catch(err => {
                throw err
            })

        return res.status(200).json(getMiningInfo)
    } catch (err) {
        next(err)
    }
}

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
const getGovernanceInfo = async (req, res, next) => {
    try {

        let getGovernanceInfo = await clientRPC
            .callRpc('getgovernanceinfo')
            .call()
            .catch(err => {
                throw err
            })

        return res.status(200).json(getGovernanceInfo);
    } catch (err) {
        next(err)
    }
}

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

const getSuperBlockBudget = async (req, res, next) => {
    try {

        let getGovernanceInfo = await clientRPC
            .callRpc('getgovernanceinfo')
            .call()
            .catch(err => {
                throw err
            })

        let {lastsuperblock, nextsuperblock} = getGovernanceInfo;

        let getSuperBlockBudgetLast = await clientRPC
            .callRpc("getsuperblockbudget", [lastsuperblock])
            .call(true)
            .catch(err => {
                throw err
            })

        let getSuperBlockBudgetNext = await clientRPC
            .callRpc("getsuperblockbudget", [nextsuperblock])
            .call(true)
            .catch(err => {
                throw err
            })

        let lbs = {block: lastsuperblock, budget: getSuperBlockBudgetLast};
        let nbs = {block: nextsuperblock, budget: getSuperBlockBudgetNext};
        console.log(lbs)
        console.log(nbs)
        return res.status(200).json({ok: true, lbs: lbs, nbs: nbs})
    } catch (err) {
        next(err)
    }
}

/**
 * @function
 * @name getAllMasterNodesByUser
 * @desc get all masterNodes per user and their voting information
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

const getAllMasterNodesByUser = async (req, res, next) => {
    try {
        let {hash} = req.query;
        let nodes = [];
        let votesResponse = {};
        let votesArr = [];
        let rdata = {};

        let user = await admin.firestore()
            .collection(process.env.COLLECTION_NAME_USERS)
            .doc(req.user)
            .get();

        if (typeof user._fieldsProto === "undefined") return res.status(406).json({
            ok: false,
            message: 'non-existent user'
        });
        if (user.id !== req.user) return res.status(406).json({
            ok: false,
            message: 'you do not have permissions to perform this action'
        })

        if (typeof hash !== "undefined") {
            let votesData = await clientRPC
                .callRpc('gobject_getcurrentvotes', [hash])
                .call()
                .catch(err => {
                    throw err
                })

            console.log(votesData)

            for (const key in votesData) {
                if (votesData.hasOwnProperty(key)) {
                    let data = {
                        txId: null,
                        timestamp: null,
                        vote: null,
                        funding: null
                    }

                    Object.keys(data).map((k, i) => {
                        console.log(data[k])
                        console.log(votesData[key].split(':')[i])
                        data[k] = votesData[key].split(':')[i]
                    })

                    votesArr.push(votesResponse[key] = data)
                }
            }
        }


        if (user._fieldsProto.mNodeList) {
            await Promise.all(user._fieldsProto.mNodeList.arrayValue.values.map(async node => {
                let n = await admin.firestore().collection(process.env.COLLECTION_NAME_MASTERNODES).doc(node.stringValue).get()
                let data = {}
                data.uid = node.stringValue;
                for (const key in n._fieldsProto) {
                    if (n._fieldsProto.hasOwnProperty(key)) {
                        // if (key === 'proposalVotes') {
                        //   let hashVotes = [];
                        //   n._fieldsProto[key].arrayValue.values.map(hash => {
                        //     let responseHash = {}
                        //     for (const key in hash.mapValue.fields) {
                        //       responseHash[key] = decryptAes(hash.mapValue.fields[key].stringValue, process.env.KEY_FOR_ENCRYPTION)
                        //     }
                        //     hashVotes.push(responseHash)
                        //   })
                        //   data[key] = hashVotes;
                        // } else
                        if (!n._fieldsProto[key][`timestampValue`]) {
                            data[key] = decryptAes(n._fieldsProto[key][`stringValue`], process.env.KEY_FOR_ENCRYPTION);
                        } else {
                            data[key] = Number(n._fieldsProto[key][`timestampValue`].seconds);
                        }
                    }
                }
                nodes.push(data)
            })).catch(err => {
                throw err
            })

            if (hash !== "undefined") {
                let votesFiltered = votesArr
                    .filter(v => nodes.find(e => e.txId === v.txId))
                    .reduce((acc, item) => {
                        if (!acc[item.txId]) {
                            acc[item.txId] = [];
                        }
                        acc[item.txId].push(item);
                        return acc;
                    }, {})

                for (const votesFilteredKey in votesFiltered) {
                    if (votesFiltered.hasOwnProperty(votesFilteredKey)) {
                        rdata[votesFilteredKey] = votesFiltered[votesFilteredKey].find(el => Math.max(Number(el.timestamp)))
                    }
                }
                console.log(rdata)
                nodes.map(e => {
                    for (const y in rdata) {
                        rdata[y].hash = hash
                        if (e.txId === y) {
                            if (rdata[y].vote === "YES") {
                                rdata[y].vote = '1'
                            } else if (rdata[y].vote === "NO") {
                                rdata[y].vote = '2'
                            } else if (rdata[y].vote === "ABSTAIN") {
                                rdata[y].vote = '3'
                            }
                            e['proposalVotes'] = [{...rdata[y]}]
                        }
                    }
                })
            }

            nodes.sort(function (x, y) {
                return x.date - y.date;
            })

            return res.status(200).json({ok: true, nodes: nodes.reverse()});
        } else {
            return res.status(204).json({ok: false, message: 'There are no associated masterNodes'})
        }
    } catch (err) {
        // console.log(err)
        next(err)
    }
}


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

const getMasterNode = async (req, res, next) => {
    try {
        let {id} = req.params;
        let existMasterNodeInUser;
        let decryptData = {};

        let user = await admin.firestore()
            .collection(process.env.COLLECTION_NAME_USERS)
            .doc(req.user)
            .get()
            .catch(err => {
                throw err
            })

        if (typeof user._fieldsProto === "undefined") return res.status(406).json({
            ok: false,
            message: 'non-existent user'
        });
        if (user.id !== req.user) return res.status(406).json({
            ok: false,
            message: 'you do not have permissions to perform this action'
        })
        if (typeof user._fieldsProto.mNodeList !== "undefined" && user._fieldsProto.mNodeList.arrayValue.values.length > 0) {
            if (typeof user._fieldsProto.mNodeList.arrayValue.values.find(e => e.stringValue === id) === "undefined") return res.status(406).json({
                ok: false,
                message: 'you do not have permissions to perform this action'
            })

            existMasterNodeInUser = user._fieldsProto.mNodeList.arrayValue.values.find(element => element.stringValue === id);

            if (typeof existMasterNodeInUser !== "undefined") {
                let {_fieldsProto} = await admin.firestore()
                    .collection(process.env.COLLECTION_NAME_MASTERNODES)
                    .doc(id)
                    .get()
                    .catch(err => {
                        throw err
                    })

                for (let key in _fieldsProto) {
                    if (_fieldsProto.hasOwnProperty(key)) {
                        if (key !== 'date') {
                            decryptData[key] = decryptAes(_fieldsProto[key][`stringValue`], process.env.KEY_FOR_ENCRYPTION);
                        } else if (key === 'date') {
                            decryptData[key] = Number(_fieldsProto[key][`timestampValue`]['seconds']);
                        } else {
                            decryptData[key] = _fieldsProto[key][`timestampValue`]['seconds'];
                        }
                    }
                }

                return res.status(200).json({ok: true, ndNode: decryptData});
            } else {
                return res.status(204).json({ok: true, message: 'Unknown masterNode'});
            }
        } else {
            return res.status(204).json({ok: true, message: 'It does not have associated MasterNodes'});
        }
    } catch (err) {
        next(err)
    }
}

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
 * @param {object} req.body.privateKey
 * @param {object} req.body.txId Fee transaction ID
 * @param {object} req.body.listMN masterNode list from masternode.conf
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 *
 */
const createMasterNode = async (req, res, next) => {
    try {
        if (checkBodyEmpty(req.body)) return res.status(406).json({ok: false, message: 'Required fields'});
        let {name, privateKey, txId, listMN} = req.body;
        let file = req.files;
        let nodes = [];
        let accNodes = 0;
        let dataEncrypt = class {
            async encryptMasterNode(mn) {
                let encrypted = {};
                if (checkMN(mn)) {
                    for (const rpcServicesKey in mn) {
                        encrypted[rpcServicesKey] = encryptAes(mn[rpcServicesKey], process.env.KEY_FOR_ENCRYPTION)
                        encrypted.date = await admin.firestore.Timestamp.now();
                    }
                    return encrypted;
                }
            }
        };
        let user = await admin.firestore().collection(process.env.COLLECTION_NAME_USERS).doc(req.user).get();
        if (typeof user._fieldsProto === "undefined") return res.status(406).json({
            ok: false,
            message: 'non-existent user'
        });
        if (user._fieldsProto.mNodeList) {
            user._fieldsProto.mNodeList.arrayValue.values.map(node => {
                nodes.push(node.stringValue)
            })
        }
        if (listMN) {
            let lines = listMN.split(/\r*\n/)
            const commentsRemoved = lines.filter(line => line[0] !== '#');
            await Promise.all(commentsRemoved.map(async mn => {
                const lineArray = mn.split(' ');
                if (lineArray.length === 5) {
                    const newMN = {
                        name: lineArray[0].trim(),
                        privateKey: lineArray[2].trim(),
                        txId: `${lineArray[3].trim()}-${lineArray[4].trim()}`
                    }
                    let encryptedMN = await dataEncrypt.prototype.encryptMasterNode(newMN)
                    let resp = await admin.firestore().collection(process.env.COLLECTION_NAME_MASTERNODES).add(encryptedMN);
                    nodes.push(resp._path.id)
                    accNodes = accNodes++;
                }
            }))
            await admin.firestore().doc(`${process.env.COLLECTION_NAME_USERS}/${req.user}`).update('mNodeList', nodes);
            let info = await admin.firestore().collection(process.env.COLLECTION_NAME_INFO).doc(process.env.COLLECTION_INFO_UID).get()
            await admin.firestore().collection(process.env.COLLECTION_NAME_INFO).doc(process.env.COLLECTION_INFO_UID).update({nMnodes: Number(info[`_fieldsProto`][`nMnodes`][`integerValue`]) + accNodes})
        } else if (!listMN) {
            if (!name || !privateKey || !txId) return res.status(406).json({ok: false, message: 'Required fields'});
            let mn = {name: name.trim(), privateKey: privateKey.trim(), txId: txId.trim()}
            if (!checkMN(mn)) return res.status(406).json({ok: false, messasge: 'mn invalid'});
            let encryptedMN = await dataEncrypt.prototype.encryptMasterNode(mn)
            let resp = await admin.firestore().collection(process.env.COLLECTION_NAME_MASTERNODES).add(encryptedMN);
            nodes.push(resp._path.id)
            await admin.firestore().doc(`${process.env.COLLECTION_NAME_USERS}/${req.user}`).update('mNodeList', nodes);
            let info = await admin.firestore().collection(process.env.COLLECTION_NAME_INFO).doc(process.env.COLLECTION_INFO_UID).get()
            await admin.firestore().collection(process.env.COLLECTION_NAME_INFO).doc(process.env.COLLECTION_INFO_UID).update({nMnodes: Number(info[`_fieldsProto`][`nMnodes`][`integerValue`]) + 1})
        } else if (file) {
            console.log('file')
        }
        return res.status(200).json({ok: false, message: 'created masterNode'});
    } catch (err) {
        next(err)
    }
}

/**
 * @function
 * @name updateMaterNode
 * @desc update data from a masterNode
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
const updateMaterNode = async (req, res, next) => {
    try {
        let {id} = req.params;
        let {data} = req.body;
        let dataEncrypt = {};
        let user = await admin.firestore().collection(process.env.COLLECTION_NAME_USERS).doc(req.user).get();
        if (typeof user._fieldsProto === "undefined") return res.status(406).json({
            ok: false,
            message: 'non-existent user'
        });
        if (typeof user._fieldsProto.mNodeList.arrayValue.values.find(e => e.stringValue === id) === "undefined") return res.status(406).json({
            ok: false,
            message: 'you do not have permissions to perform this action'
        })
        // if (user.id !== req.user) return res.status(406).json({ok: false, message: 'you do not have permissions to perform this action'})
        if (!data) return res.status(406).json({ok: false, message: 'Required fields'});
        if (!checkMN(data)) return res.status(406).json({ok: false, messasge: 'invalid MasterNode'});
        for (const key in data) {
            dataEncrypt[key] = encryptAes(data[key], process.env.KEY_FOR_ENCRYPTION);
        }
        await admin.firestore().doc(`${process.env.COLLECTION_NAME_MASTERNODES}/${id}`).update(dataEncrypt).catch(err => {
            throw err
        })
        return res.status(200).json({ok: true, message: 'MasterNode Updated'});
    } catch (err) {
        next(err)
    }
}

/**
 * @function
 * @name destroyMasterNode
 * @desc remove a masterNode from db
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
const destroyMasterNode = async (req, res, next) => {
    try {
        let {id} = req.params;
        let nodes = [];
        let existMasterNodeInUser;
        let user = await admin.firestore().collection(process.env.COLLECTION_NAME_USERS).doc(req.user).get()
        if (typeof user._fieldsProto === "undefined") return res.status(406).json({
            ok: false,
            message: 'non-existent user'
        });
        if (user.id !== req.user) return res.status(406).json({
            ok: false,
            message: 'you do not have permissions to perform this action'
        })
        if (user._fieldsProto.mNodeList.arrayValue.values.length > 0) {
            existMasterNodeInUser = user._fieldsProto.mNodeList.arrayValue.values.find(element => element.stringValue === id);
            if (typeof existMasterNodeInUser !== "undefined") {
                user._fieldsProto.mNodeList.arrayValue.values.map(node => {
                    nodes.push(node.stringValue)
                })
                let index = nodes.findIndex(element => element === existMasterNodeInUser.stringValue)
                nodes.splice(index, 1)
                await admin.firestore().doc(`${process.env.COLLECTION_NAME_USERS}/${req.user}`).update('mNodeList', nodes).catch(err => {
                    throw err
                })
                await admin.firestore().doc(`${process.env.COLLECTION_NAME_MASTERNODES}/${id}`).delete().catch(err => {
                    throw err
                })
                let info = await admin.firestore().collection(process.env.COLLECTION_NAME_INFO).doc(process.env.COLLECTION_INFO_UID).get()
                await admin.firestore().collection(process.env.COLLECTION_NAME_INFO).doc(process.env.COLLECTION_INFO_UID).update({nMnodes: Number(info[`_fieldsProto`][`nMnodes`][`integerValue`]) - 1})
                return res.status(200).json({ok: true, message: 'MasterNode Deleted'});
            } else {
                return res.status(204).json({ok: true, message: 'MasterNode Deleted'});
            }
        } else {
            return res.status(204).json({ok: true, message: 'It does not have associated Masternodes'});
        }
    } catch (err) {
        next(err)
    }
}

const masterNodeVoteIn = async (req, res, next) => {
    try {
        let {id} = req.params;
        let {hash, mnTxId, votingOption} = req.body;
        let proposalVotes = [];
        let votesResponse = {};
        let votesArr = [];
        let user = await admin.firestore().collection(process.env.COLLECTION_NAME_USERS).doc(req.user).get()
        if (typeof user._fieldsProto === "undefined") return res.status(406).json({
            ok: false,
            message: 'non-existent user'
        });
        if (user.id !== req.user) return res.status(406).json({
            ok: false,
            message: 'you do not have permissions to perform this action'
        })
        if (user._fieldsProto.mNodeList || user._fieldsProto.mNodeList.arrayValue.values.length > 0) {
            let verifyMNInUser = user._fieldsProto.mNodeList.arrayValue.values.find(mn => mn.stringValue === id)
            if (typeof verifyMNInUser === "undefined") return res.status(406).json({
                ok: false,
                message: 'masternode not found'
            })
        }
        let mn = await admin.firestore().collection(process.env.COLLECTION_NAME_MASTERNODES).doc(id).get().catch(err => {
            throw err
        })
        if (typeof mn._fieldsProto === "undefined") return res.status(204).json({
            ok: false,
            message: 'MasterNode does not exist'
        })

        let votesData = await clientRPC.callRpc('gobject', ['getvotes', hash]).call().catch(err => {
            throw err
        })

        for (const key in votesData) {
            let data = {
                txId: null,
                timestamp: null,
                vote: null,
                funding: null
            }
            Object.keys(data).map((k, i) => {
                data[k] = votesData[key].split(':')[i]
            })

            votesArr.push(votesResponse[key] = data)
        }

        let votesFiltered = votesArr
            .filter(v => mnTxId.find(e => e === v.txId))
            .reduce((acc, item) => {
                if (!acc[item.txId]) {
                    acc[item.txId] = [];
                }
                acc[item.txId].push(item);
                return acc;
            }, {})
        let rdata = {}
        for (const votesFilteredKey in votesFiltered) {
            rdata[votesFilteredKey] = votesFiltered[votesFilteredKey].find(el => Math.max(Number(el.timestamp)))
        }

        if (Object.keys(rdata).length > 0) {
            console.log(Object.keys(rdata)[0])
            // if (!mn._fieldsProto.proposalVotes) {
            //     console.log(Object.keys(rdata)[0])
            //     // proposalVotes.push({hash: encryptAes(hash, process.env.KEY_FOR_ENCRYPTION), votingOption: encryptAes(, process.env.KEY_FOR_ENCRYPTION)})
            //   }
        }
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
        // await admin.firestore().collection(process.env.COLLECTION_NAME_MASTERNODES).doc(id).update({proposalVotes: proposalVotes}).catch(err => {
        //   throw err
        // })
        res.send(rdata)
        // return res.status(200).json({ok: true, message: 'saved'})
    } catch (err) {
        console.log(err)
        next(err)
    }
}

module.exports = {
    countMasterNodes,
    list,
    info,
    getMiningInfo,
    getGovernanceInfo,
    getSuperBlockBudget,
    getAllMasterNodesByUser,
    getMasterNode,
    createMasterNode,
    updateMaterNode,
    destroyMasterNode,
    masterNodeVoteIn
}
