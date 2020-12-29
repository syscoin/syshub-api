const {clientRPC, rpcServices, admin} = require('../utils/config');
const {strToHex} = require('../utils/hex');

/**
 * @function
 * @name check
 * @desc Validate governance object data (proposal only)
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {number} req.body.type 0 or 1
 * @param {string} req.body.name name of the proposal
 * @param {string} req.body.title title of the proposal
 * @param {string} req.body.description description of the proposal
 * @param {number} req.body.nPayment number of payments of the proposal
 * @param {number} req.body.firstEpoch Create time (Unix epoch time)
 * @param {number} req.body.startEpoch Create time (Unix epoch time)
 * @param {number} req.body.endEpoch   Create time (Unix epoch time)
 * @param {string} req.body.paymentAddress proposal payment address
 * @param {number} req.body.paymentAmount value of the proposal payment
 * @param {string} req.body.url url of the proposal
 *
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */

const check = async (req, res, next) => {
    try {
        let {
            type,
            name,
            title,
            description,
            nPayment,
            firstEpoch,
            startEpoch,
            endEpoch,
            paymentAddress,
            paymentAmount,
            url
        } = req.body;
        // paymentAddress='tsys1q0radv3ngud8pq048gxawstwg8qgxmwfw99cspp'
        if (!type || !name || !title || !nPayment || !firstEpoch || !startEpoch || !endEpoch || !paymentAddress || !paymentAmount) return res.status(406).json({
            ok: false,
            messageL: 'Required fields'
        });
        if (/\s/.test(name)) return res.status(406).json({
            ok: false,
            message: 'Invalid name proposal, name contains invalid characters'
        });

        let objectProposal = {
            type: Number(type),
            name,
            title,
            description,
            nPayment: Number(nPayment),
            first_epoch: Number(firstEpoch),
            start_epoch: Number(startEpoch),
            end_epoch: Number(endEpoch),
            payment_address: paymentAddress,
            payment_amount: Number(paymentAmount),
            url: (typeof url !== "undefined") ? url : 'empty'
        }
        let hexProposal = strToHex(objectProposal);

        let verifyHex = await clientRPC
            .callRpc('gobject_check', [hexProposal])
            .call()
            .catch(err => {
                throw err
            })

        if (verifyHex && Object.values(verifyHex)[0] === 'OK') {
            return res.status(200).json({ok: true, message: 'Proposal OK'});
        }
    } catch (err) {
        if (err.message === 'Invalid proposal data, error messages:data exceeds 512 characters;JSON parsing error;') return res.status(400).json({
            ok: false,
            message: 'Invalid Proposal'
        })
        if (err.message === 'Invalid object type, only proposals can be validated') return res.status(400).json({
            ok: false,
            message: 'Invalid Proposal'
        })
        next(err)
    }
}


/**
 * @function
 * @name prepare
 * @desc Prepare governance object by signing and creating tx
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.user is an opaque identifier for a user account obtained from the token.
 * @param {number} req.body.type 0 or 1
 * @param {string} req.body.name name of the proposal
 * @param {string} req.body.title title of the proposal
 * @param {string} req.body.description description of the proposal
 * @param {number} req.body.nPayment number of payments of the proposal
 * @param {number} req.body.firstEpoch Create time (Unix epoch time)
 * @param {number} req.body.startEpoch Create time (Unix epoch time)
 * @param {number} req.body.endEpoch   Create time (Unix epoch time)
 * @param {string} req.body.paymentAddress proposal payment address
 * @param {number} req.body.paymentAmount value of the proposal payment
 * @param {string} req.body.url url of the proposal
 *
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */

const prepare = async (req, res, next) => {
    try {
        let proposals = [];
        let {
            type,
            name,
            title,
            description,
            nPayment,
            firstEpoch,
            startEpoch,
            endEpoch,
            paymentAddress,
            paymentAmount,
            url
        } = req.body;
        // paymentAddress='tsys1q0radv3ngud8pq048gxawstwg8qgxmwfw99cspp'
        if (!type || !name || !title || !nPayment || !firstEpoch || !startEpoch || !endEpoch || !paymentAddress || !paymentAmount) return res.status(406).json({
            ok: false,
            messageL: 'Required fields'
        });
        if (/\s/.test(name)) return res.status(406).json({
            ok: false,
            message: 'Invalid name proposal, name contains invalid characters'
        });
        let user = await admin.firestore()
            .collection(process.env.COLLECTION_NAME_USERS)
            .doc(req.user)
            .get().catch(err => {
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

        let objectProposal = {
            type: Number(type),
            name,
            title,
            description,
            nPayment: Number(nPayment),
            first_epoch: Number(firstEpoch),
            start_epoch: Number(startEpoch),
            end_epoch: Number(endEpoch),
            payment_address: paymentAddress,
            payment_amount: Number(paymentAmount),
            url: (typeof url !== "undefined") ? url : 'empty'
        }

        let hexProposal = strToHex(objectProposal);

        let verifyHex = await clientRPC
            .callRpc('gobject_check', [hexProposal])
            .call()
            .catch(err => {
                throw err
            })

        if (verifyHex && Object.values(verifyHex)[0] === 'OK') {
            let prepareObjectProposal = {
                parentHash: '0',
                revision: '1',
                time: Math.floor(new Date().getTime() / 1000),
                dataHex: hexProposal
            }

            let {parentHash, revision, time, dataHex} = prepareObjectProposal;
            let command = `gobject_prepare ${parentHash} ${revision} ${time} ${dataHex}`;
            let proposalResp = await admin.firestore()
                .collection(process.env.COLLECTION_NAME_PROPOSAL)
                .add({
                    type: Number(type),
                    name,
                    title,
                    description,
                    nPayment: Number(nPayment),
                    first_epoch: Number(firstEpoch),
                    start_epoch: Number(startEpoch),
                    end_epoch: Number(endEpoch),
                    payment_address: paymentAddress,
                    payment_amount: Number(paymentAmount),
                    url: (typeof url !== "undefined") ? url : 'empty',
                    prepareObjectProposal,
                    prepareCommand: command,
                    complete: false
                }).catch(err => {
                    throw err
                })
            if (user._fieldsProto.proposalList) {
                user._fieldsProto.proposalList.arrayValue.values.map(proposal => {
                    proposals.push(proposal.stringValue)
                })
            }
            proposals.push(proposalResp._path.id)
            await admin.firestore()
                .doc(`${process.env.COLLECTION_NAME_USERS}/${req.user}`)
                .update('proposalList', proposals)
                .catch(err => {
                    throw err
                })
            return res.status(200).json({ok: true, command: command, uid: proposalResp._path.id});
        } else {
            return res.status(400).json({ok: false, message: 'hex Invalido'})
        }
    } catch (err) {
        next(err)
    }
}

/**
 * @function
 * @name submit
 * @desc Submit governance object to network
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.user is an opaque identifier for a user account obtained from the token.
 * @param {number} req.body.parentHash Hash of the parent object. Usually the root node which has a hash of 0
 * @param {number} req.body.revision Object revision number
 * @param {number} req.body.time Create time (Unix epoch time)
 * @param {string} req.body.dataHex Object data (JSON object with governance details).
 * @param {string} req.body.txId Fee transaction ID - required for all objects except triggers
 *
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */

const submit = async (req, res, next) => {
    try {
        let {id} = req.params;
        let {parentHash, revision, time, dataHex, txId} = req.body;
        if (!parentHash || !revision || !time || !dataHex || !txId) return res.status(406).json({
            ok: false,
            message: 'Required fields'
        });
        let user = await admin.firestore()
            .collection(process.env.COLLECTION_NAME_USERS)
            .doc(req.user)
            .get()
            .catch(err => {
                throw err
            });

        if (typeof user._fieldsProto === "undefined") return res.status(406).json({
            ok: false,
            message: 'non-existent user'
        });

        if (user.id !== req.user) return res.status(406).json({
            ok: false,
            message: 'you do not have permissions to perform this action'
        })

        let commandSubmit = `gobject_submit ${parentHash} ${revision} ${time} ${dataHex} ${txId}`.trim();

        let verifyHex = await clientRPC
            .callRpc('gobject_check', [dataHex])
            .call()
            .catch(err => {
                throw err
            })

        if (verifyHex && Object.values(verifyHex)[0] === 'OK') {

            await clientRPC
                .callRpc('gobject_check', [dataHex])
                .call()
                .catch(err => {
                    throw err
                })

            await admin.firestore()
                .collection(process.env.COLLECTION_NAME_PROPOSAL)
                .doc(id)
                .update({commandSubmit: commandSubmit})
                .catch(err => {
                    throw err
                })

            return res.status(200).json({ok: true, commandSubmit})
        } else {
            return res.status(400).json({ok: false, message: 'hex Invalid'})
        }
    } catch (err) {
        console.log(err)
        next(err)
    }
}

/**
 * @function
 * @name vote
 * @desc Compile and relay a governance vote with provided external signature instead of signing vote internally
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.user is an opaque identifier for a user account obtained from the token.
 * @param {number} req.body.txHash Hash of the masternode collateral transaction
 * @param {number} req.body.txIndex Index of the masternode collateral transaction
 * @param {number} req.body.governanceHash Hash of the governance object
 * @param {string} req.body.signal Vote signal: funding, valid, or delete
 * @param {string} req.body.vote Vote outcome: yes, no, or abstain
 * @param {string} req.body.time Create time
 * @param {string} req.body.signature vote signature
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */
const vote = async (req, res, next) => {
    try {
        const {txHash, txIndex, governanceHash, signal, vote, time, signature} = req.body;
        console.log(req.body)
        if (!txHash || !txIndex || !governanceHash || !signal || !vote || !time || !signature) return res.status(406).json({
            ok: false,
            message: 'Required fields'
        });
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
        let voteRaw = await new Promise((resolve, reject) => {
            rpcServices(clientRPC.callRpc)
                .voteRaw(
                    txHash,
                    Number(txIndex),
                    governanceHash,
                    signal,
                    vote,
                    time,
                    signature)
                .call(true)
                .then(({data}) => {
                    resolve(data)
                })
                .catch(err => {
                    reject(new Error(err))
                })
        })
        return res.status(200).json(voteRaw)
    } catch (err) {
        if (err.message.split(':')[1].trim() === 'Failure to find masternode in list') {
            return res.status(400).json({ok: false, message: 'Failure to find masternode in list'})
        } else if (err.message.split(':')[1].trim() === 'Error voting') {
            return res.status(400).json({ok: false, message: 'Invalid proposal hash. Please check'})
        } else if (err.message.split(':')[1].trim() === 'mn tx hash must be hexadecimal string') {
            return res.status(400).json({ok: false, message: 'Invalid txid. Please check'})
        } else if (err.message.split(':')[1].trim() === 'Failure to verify vote.') {
            return res.status(400).json({ok: false, message: 'The vote cannot be verified'})
        } else if (err.message.split(':')[1].trim().split('64')[0].trim() === 'mn tx hash must be of length') {
            return res.status(400).json({ok: false, message: 'Invalid txId. Please check'})
        } else {
            next(err.message)
        }
    }
}


/**
 * @function
 * @name getProposalsPendingByUser
 * @desc Get all unfinished proposals by user
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.user is an opaque identifier for a user account obtained from the token.
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */

const getProposalsPendingByUser = async (req, res, next) => {
    try {
        let proposalData = {};
        await admin.firestore().collection(process.env.COLLECTION_NAME_USERS).doc(req.user).get().then(user => {
            if (user._fieldsProto.proposalList) {
                Promise.all(user._fieldsProto.proposalList.arrayValue.values.map(async proposal => {
                    return new Promise((resolve, reject) => {
                        admin.firestore()
                            .collection(process.env.COLLECTION_NAME_PROPOSAL)
                            .doc(proposal.stringValue)
                            .get()
                            .then(resp => {
                                resolve(resp)
                            })
                            .catch(err => {
                                reject(err)
                            })
                    })
                })).then(elements => {
                    let proposalNoComplete = elements.filter(elem => elem._fieldsProto.complete.booleanValue === false)
                    let proposalreciente = Math.max.apply(Math, proposalNoComplete.map(function (o) {
                        return o._createTime.nanoseconds;
                    }))
                    let currentNoCompleteProposal = proposalNoComplete.find(proposal => proposal._createTime.nanoseconds === proposalreciente)

                    if (typeof currentNoCompleteProposal === "undefined") return res.status(204).json({
                        oK: false,
                        message: 'there are no pending proposals'
                    })

                    for (const key in currentNoCompleteProposal._fieldsProto) {
                        proposalData['uid'] = currentNoCompleteProposal.id
                        if (currentNoCompleteProposal._fieldsProto.hasOwnProperty(key)) {
                            if (typeof currentNoCompleteProposal._fieldsProto[key].integerValue !== "undefined") {
                                proposalData[key] = Number(currentNoCompleteProposal._fieldsProto[key][`integerValue`]);
                            } else if (typeof currentNoCompleteProposal._fieldsProto[key].booleanValue !== "undefined") {
                                proposalData[key] = currentNoCompleteProposal._fieldsProto[key][`booleanValue`];
                            } else {
                                proposalData[key] = currentNoCompleteProposal._fieldsProto[key][`stringValue`];
                            }
                        }
                    }
                    return res.status(200).json({ok: true, proposal: proposalData});
                }).catch(err => {
                    throw err
                })
            } else {
                return res.status(204).json({ok: false, message: 'No proposals'})
            }
        }).catch(err => {
            throw err
        })
    } catch (err) {
        next(err)
    }
}

/**
 * @function
 * @name getOneProposal
 * @desc Get the information of a proposal
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.params.id uid of the proposal saved in the firebase collection
 * @param {string} req.user is an opaque identifier for a user account obtained from the token.
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */

const getOneProposal = async (req, res, next) => {
    try {
        let {id} = req.params;
        let existProposalsInUser;
        let data = {};
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
        if (user._fieldsProto.proposalList && user._fieldsProto.proposalList.arrayValue.values.length > 0) {
            existProposalsInUser = user._fieldsProto.proposalList.arrayValue.values.find(element => element.stringValue === id);
            if (typeof existProposalsInUser !== "undefined") {
                let {_fieldsProto} = await admin.firestore()
                    .collection(process.env.COLLECTION_NAME_PROPOSAL)
                    .doc(id)
                    .get()
                    .catch(err => {
                        throw err
                    })
                for (const key in _fieldsProto) {
                    if (_fieldsProto.hasOwnProperty(key)) {
                        data[key] = _fieldsProto[key][`stringValue`];
                    }
                }
                return res.status(200).json({ok: true, proposal: data});
            } else {
                return res.status(204).json({ok: true, message: 'Proposal unknown'});
            }
        } else {
            return res.status(204).json({ok: true, message: 'Does not have Proposal associates'});
        }
    } catch (err) {
        next(err)
    }
}

/**
 * @function
 * @name getAllHiddenProposal
 * @desc get all hidden proposal hashes
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 *
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */

const getAllHiddenProposal = async (req, res, next) => {
    try {
        let proposalHash = [];
        let data = await admin.firestore()
            .collection(process.env.COLLECTION_PROPOSAL_HIDDEN)
            .get()
            .catch(err => {
                throw err
            })
        await data._docs().map(elem => {
            let newData = {};
            for (const key in elem._fieldsProto) {
                if (elem._fieldsProto.hasOwnProperty(key)) {
                    newData['uid'] = elem.id
                    newData['createTime'] = elem._createTime._seconds
                    newData[key] = elem._fieldsProto[key].stringValue
                }
            }
            proposalHash.push(newData)
        })
        proposalHash.sort((a, b) => a.createTime - b.createTime).reverse();
        return res.status(200).json({ok: true, proposalHash})
    } catch (err) {
        next(err)
    }
}

/**
 * @function
 * @name createHiddenProposal
 * @desc Create a new hidden proposal
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.body.hash Hash of the governance object
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */
const createHiddenProposal = async (req, res, next) => {
    try {
        let {hash} = req.body;
        if (!hash) return res.status(406).json({ok: false, message: 'required fields'});
        if (hash.length !== 64) return res.status(406).json({ok: false, message: 'invalid proposal hash'});
        let isHidden = await admin.firestore()
            .collection(process.env.COLLECTION_PROPOSAL_HIDDEN)
            .where('hash', "==", hash)
            .get()
            .catch(err => {
                throw err
            })
        if (isHidden.size > 0) return res.status(200).json({ok: false, message: 'Proposal already hidden'});

        await admin.firestore()
            .collection(process.env.COLLECTION_PROPOSAL_HIDDEN)
            .add({hash})
            .catch(err => {
                throw err
            })
        return res.status(200).json({ok: true, message: 'hash created'})
    } catch (err) {
        next(err)
    }
}

/**
 * @function
 * @name deleteHiddenProposal
 * @desc Delete a hidden proposal
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.params.id uid of the proposal saved in the firebase collection
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */
const deleteHiddenProposal = async (req, res, next) => {
    try {
        let {hash} = req.params;
        let isHidden = await admin.firestore()
            .collection(process.env.COLLECTION_PROPOSAL_HIDDEN)
            .doc(hash)
            .get()
            .catch(err => {
                throw err
            })

        if (typeof isHidden._fieldsProto === "undefined") {
            return res.status(204).json({ok: false, message: 'no exist proposal'})
        }

        await admin.firestore()
            .collection(process.env.COLLECTION_PROPOSAL_HIDDEN)
            .doc(hash)
            .delete()
            .catch(err => {
                throw err
            })
        return res.status(200).json({ok: true, message: 'hash removed'})
    } catch (err) {
        next(err)
    }
}

/**
 * @function
 * @name updateProposal
 * @desc Update the information of the proposal or its status
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.params.id uid of the proposal saved in the firebase collection
 * @param {object} req.body.data data obtained from the front for update
 * @param {string} req.user is an opaque identifier for a user account obtained from the token.
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */

const updateProposal = async (req, res, next) => {
    try {
        let {id} = req.params;
        let {data} = req.body;
        let newData = {};
        let respData = {};
        let prepareObjectProposal = {}
        let existProposalInUser;
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
        if (!data) return res.status(406).json({ok: false, message: 'Required fields'});

        existProposalInUser = user._fieldsProto.proposalList.arrayValue.values.find(element => element.stringValue === id);

        if (typeof existProposalInUser === "undefined") return res.status(204).json({
            ok: false,
            message: 'non-existent proposal'
        });

        for (const key in data) {
            newData[key] = data[key]
        }

        await admin.firestore()
            .doc(`${process.env.COLLECTION_NAME_PROPOSAL}/${id}`)
            .update(newData)
            .catch(err => {
                throw err
            });

        let proposal = await admin.firestore()
            .doc(`${process.env.COLLECTION_NAME_PROPOSAL}/${id}`)
            .get()
            .catch(err => {
                throw err
            })

        for (const key in proposal._fieldsProto) {
            if (proposal._fieldsProto.hasOwnProperty(key)) {
                if (proposal._fieldsProto[key].integerValue) {
                    respData[key] = proposal._fieldsProto[key].integerValue
                } else {
                    respData[key] = proposal._fieldsProto[key].stringValue
                }
            }

        }

        if (proposal._fieldsProto['prepareObjectProposal']) {
            for (const prepareKey in proposal._fieldsProto['prepareObjectProposal'].mapValue.fields) {
                if (proposal._fieldsProto['prepareObjectProposal'].mapValue.fields[prepareKey].valueType === 'integerValue') {
                    prepareObjectProposal[prepareKey] = proposal._fieldsProto['prepareObjectProposal'].mapValue.fields[prepareKey].integerValue
                } else {
                    prepareObjectProposal[prepareKey] = proposal._fieldsProto['prepareObjectProposal'].mapValue.fields[prepareKey].stringValue
                }
            }
        }

        respData = {...respData, prepareObjectProposal}
        return res.status(200).json({ok: true, proposal: respData});
    } catch
        (err) {
        next(err)
    }
}

/**
 * @function
 * @name deleteProposal
 * @desc Remove a proposal from db
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.params.id uid of the proposal saved in the firebase collection
 * @param {data} req.body data obtained from the front for update
 * @param {string} req.user is an opaque identifier for a user account obtained from the token.
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */

const deleteProposal = async (req, res, next) => {
    try {
        let {id} = req.params;
        let existProposalInUser;
        let proposals = [];
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
        if (user._fieldsProto.proposalList.arrayValue.values.length > 0) {
            existProposalInUser = user._fieldsProto.proposalList.arrayValue.values.find(element => element.stringValue === id);
            if (typeof existProposalInUser !== "undefined") {
                user._fieldsProto.proposalList.arrayValue.values.map(proposal => {
                    proposals.push(proposal.stringValue)
                })
                let index = proposals.findIndex(element => element === existProposalInUser.stringValue)
                proposals.splice(index, 1)
                await admin.firestore()
                    .doc(`${process.env.COLLECTION_NAME_USERS}/${req.user}`)
                    .update('proposalList', proposals)
                    .catch(err => {
                        throw err
                    })
                await admin.firestore()
                    .doc(`${process.env.COLLECTION_NAME_PROPOSAL}/${id}`)
                    .delete()
                    .catch(err => {
                        throw err
                    })
                return res.status(200).json({ok: true, message: 'Proposal Removed'});
            } else {
                return res.status(204).json({ok: true, message: 'Proposal unknown'});
            }
        } else {
            return res.status(204).json({ok: true, message: 'Does not have associated Proposals'});
        }
    } catch (err) {
        next(err)
    }
}

module.exports = {
    check,
    prepare,
    submit,
    vote,
    getOneProposal,
    updateProposal,
    deleteProposal,
    createHiddenProposal,
    deleteHiddenProposal,
    getAllHiddenProposal,
    getProposalsPendingByUser
}
