const { clientRPC, rpcServices, admin } = require('../utils/config')
const { strToHex } = require('../utils/hex')

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

// eslint-disable-next-line consistent-return
const check = async (req, res, next) => {
  try {
    const {
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
      url,
    } = req.body
    // eslint-disable-next-line max-len
    if (
      !type ||
      !name ||
      !title ||
      !nPayment ||
      !firstEpoch ||
      !startEpoch ||
      !endEpoch ||
      !paymentAddress ||
      !paymentAmount
    ) {
      return res.status(406).json({
        ok: false,
        messageL: 'Required fields',
      })
    }
    if (/\s/.test(name)) {
      return res.status(406).json({
        ok: false,
        message: 'Invalid name proposal, name contains invalid characters',
      })
    }

    // MED-007: Validate description size BEFORE hex conversion and RPC call
    // This prevents wasted RPC calls and provides faster feedback to users
    if (description && description.length > 512) {
      return res.status(400).json({
        ok: false,
        message: 'Description exceeds 512 characters limit',
      })
    }

    const objectProposal = [
      [
        'proposal',
        {
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
          url: typeof url !== 'undefined' ? url : 'empty',
        },
      ],
    ]
    const hexProposal = strToHex(objectProposal[0][1])

    // Additional validation: Check hex size after conversion
    // This catches edge cases where the serialized data might be too large
    if (hexProposal.length > 4096) { // 2KB hex = 4096 characters
      return res.status(400).json({
        ok: false,
        message: 'Proposal data too large after serialization',
      })
    }

    const verifyHex = await clientRPC
      .callRpc('gobject_check', [hexProposal])
      .call()
      .catch((err) => {
        throw err
      })

    if (verifyHex && Object.values(verifyHex)[0] === 'OK') {
      return res.status(200).json({ ok: true, message: 'Proposal OK' })
    }
  } catch (err) {
    if (
      err.message ===
      'Invalid proposal data, error messages:data exceeds 512 characters;JSON parsing error;'
    ) {
      return res.status(400).json({
        ok: false,
        message: 'Invalid Proposal',
      })
    }
    if (
      err.message === 'Invalid object type, only proposals can be validated'
    ) {
      return res.status(400).json({
        ok: false,
        message: 'Invalid Proposal',
      })
    }
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

// eslint-disable-next-line consistent-return
const prepare = async (req, res, next) => {
  try {
    const proposals = []
    const {
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
      url,
    } = req.body
    // eslint-disable-next-line max-len
    if (
      !type ||
      !name ||
      !title ||
      !nPayment ||
      !firstEpoch ||
      !startEpoch ||
      !endEpoch ||
      !paymentAddress ||
      !paymentAmount
    ) {
      return res.status(406).json({
        ok: false,
        messageL: 'Required fields',
      })
    }
    if (/\s/.test(name)) {
      return res.status(406).json({
        ok: false,
        message: 'Invalid name proposal, name contains invalid characters',
      })
    }
    const user = await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_USERS)
      .doc(req.user)
      .get()
      .catch((err) => {
        throw err
      })
    // eslint-disable-next-line no-underscore-dangle
    if (typeof user._fieldsProto === 'undefined') {
      return res.status(406).json({
        ok: false,
        message: 'non-existent user',
      })
    }
    if (user.id !== req.user) {
      return res.status(406).json({
        ok: false,
        message: 'you do not have permissions to perform this action',
      })
    }

    const objectProposal = [
      [
        'proposal',
        {
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
          url: typeof url !== 'undefined' ? url : 'empty',
        },
      ],
    ]

    const hexProposal = strToHex(objectProposal[0][1])

    const verifyHex = await clientRPC
      .callRpc('gobject_check', [hexProposal])
      .call()
      .catch((err) => {
        throw err
      })

    if (verifyHex && Object.values(verifyHex)[0] === 'OK') {
      const prepareObjectProposal = {
        parentHash: '0',
        revision: '1',
        time: Math.floor(new Date().getTime() / 1000),
        dataHex: hexProposal,
      }

      const { parentHash, revision, time, dataHex } = prepareObjectProposal
      const command = `gobject_prepare ${parentHash} ${revision} ${time} ${dataHex}`
      const proposalResp = await admin
        .firestore()
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
          url: typeof url !== 'undefined' ? url : 'empty',
          prepareObjectProposal,
          prepareCommand: command,
          complete: false,
        })
        .catch((err) => {
          throw err
        })
      // eslint-disable-next-line no-underscore-dangle
      if (user._fieldsProto.proposalList) {
        // eslint-disable-next-line no-underscore-dangle,array-callback-return
        user._fieldsProto.proposalList.arrayValue.values.map((proposal) => {
          proposals.push(proposal.stringValue)
        })
      }
      // eslint-disable-next-line no-underscore-dangle
      proposals.push(proposalResp._path.id)
      await admin
        .firestore()
        .doc(`${process.env.COLLECTION_NAME_USERS}/${req.user}`)
        .update('proposalList', proposals)
        .catch((err) => {
          throw err
        })
      // eslint-disable-next-line no-underscore-dangle
      return res
        .status(200)
        .json({ ok: true, command, uid: proposalResp._path.id })
    }
    return res.status(400).json({ ok: false, message: 'hex Invalid' })
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

// eslint-disable-next-line consistent-return
const submit = async (req, res, next) => {
  try {
    const { id } = req.params
    const { parentHash, revision, time, dataHex, txId } = req.body
    if (!parentHash || !revision || !time || !dataHex || !txId) {
      return res.status(406).json({
        ok: false,
        message: 'Required fields',
      })
    }
    const user = await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_USERS)
      .doc(req.user)
      .get()
      .catch((err) => {
        throw err
      })

    // eslint-disable-next-line no-underscore-dangle
    if (typeof user._fieldsProto === 'undefined') {
      return res.status(406).json({
        ok: false,
        message: 'non-existent user',
      })
    }

    if (user.id !== req.user) {
      return res.status(406).json({
        ok: false,
        message: 'you do not have permissions to perform this action',
      })
    }

    const commandSubmit =
      `gobject_submit ${parentHash} ${revision} ${time} ${dataHex} ${txId}`.trim()

    const verifyHex = await clientRPC
      .callRpc('gobject_check', [dataHex])
      .call()
      .catch((err) => {
        throw err
      })

    if (verifyHex && Object.values(verifyHex)[0] === 'OK') {
      await clientRPC
        .callRpc('gobject_check', [dataHex])
        .call()
        .catch((err) => {
          throw err
        })

      await admin
        .firestore()
        .collection(process.env.COLLECTION_NAME_PROPOSAL)
        .doc(id)
        .update({ commandSubmit })
        .catch((err) => {
          throw err
        })

      return res.status(200).json({ ok: true, commandSubmit })
    }
    return res.status(400).json({ ok: false, message: 'hex Invalid' })
  } catch (err) {
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
 * @param {number} req.body.txHash Hash of the masterNode collateral transaction
 * @param {number} req.body.txIndex Index of the masterNode collateral transaction
 * @param {number} req.body.governanceHash Hash of the governance object
 * @param {string} req.body.signal Vote signal: funding, valid, or delete
 * @param {string} req.body.vote Vote outcome: yes, no, or abstain
 * @param {string} req.body.time Create time
 * @param {string} req.body.signature vote signature
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */
// eslint-disable-next-line consistent-return
const vote = async (req, res, next) => {
  try {
    const { txHash, txIndex, governanceHash, signal, vote, time, signature } =
      req.body

    if (
      !txHash ||
      !txIndex ||
      !governanceHash ||
      !signal ||
      !vote ||
      !time ||
      !signature
    ) {
      return res.status(406).json({
        ok: false,
        message: 'Required fields',
      })
    }
    const user = await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_USERS)
      .doc(req.user)
      .get()
      .catch((err) => {
        throw err
      })

    // eslint-disable-next-line no-underscore-dangle
    if (typeof user._fieldsProto === 'undefined') {
      return res.status(406).json({
        ok: false,
        message: 'non-existent user',
      })
    }

    if (user.id !== req.user) {
      return res.status(406).json({
        ok: false,
        message: 'you do not have permissions to perform this action',
      })
    }
    const voteRaw = await new Promise((resolve, reject) => {
      rpcServices(clientRPC.callRpc)
        .voteRaw(
          txHash,
          Number(txIndex),
          governanceHash,
          signal,
          vote,
          time,
          signature
        )
        .call(true)
        .then(({ data }) => {
          resolve(data)
        })
        .catch((err) => {
          reject(err)
        })
    })
    return res.status(200).json(voteRaw)
  } catch (err) {
    if (err.message.trim() === 'Failure to find masternode in list') {
      return res
        .status(400)
        .json({ ok: false, message: 'Failure to find masterNode in list' })
    }
    if (err.message.trim() === 'GOVERNANCE_EXCEPTION_TEMPORARY_ERROR') {
      return res.status(400).json({
        ok: false,
        // eslint-disable-next-line max-len
        message:
          'To vote on this proposal you must wait an hour then you can vote again, if you want to vote on another proposal where you have not voted, you can.',
      })
    }
    if (err.message.trim() === 'Error voting') {
      return res
        .status(400)
        .json({ ok: false, message: 'Invalid proposal hash. Please check' })
    }
    if (err.message.trim() === 'mn tx hash must be hexadecimal string') {
      return res
        .status(400)
        .json({ ok: false, message: 'Invalid txId. Please check' })
    }
    if (err.message.trim() === 'Failure to verify vote.') {
      return res
        .status(400)
        .json({ ok: false, message: 'The vote cannot be verified' })
    }
    if (/mn tx hash must be of length/.test(err.message)) {
      return res
        .status(400)
        .json({ ok: false, message: 'Invalid txId. Please check' })
    }
    next(err)
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
    const proposalData = {}
    await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_USERS)
      .doc(req.user)
      .get()
      // eslint-disable-next-line consistent-return
      .then((user) => {
        // eslint-disable-next-line no-underscore-dangle
        if (user._fieldsProto.proposalList) {
          // eslint-disable-next-line no-underscore-dangle,max-len
          Promise.all(
            user._fieldsProto.proposalList.arrayValue.values.map(
              async (proposal) =>
                new Promise((resolve, reject) => {
                  admin
                    .firestore()
                    .collection(process.env.COLLECTION_NAME_PROPOSAL)
                    .doc(proposal.stringValue)
                    .get()
                    .then((resp) => {
                      resolve(resp)
                    })
                    .catch((err) => {
                      reject(err)
                    })
                })
            )
          )
            .then((elements) => {
              // eslint-disable-next-line no-underscore-dangle
              const proposalNoComplete = elements.filter(
                (elem) => elem._fieldsProto.complete.booleanValue === false
              )
              // eslint-disable-next-line prefer-spread,no-underscore-dangle
              const proposalReciente = Math.max.apply(
                Math,
                proposalNoComplete.map((o) => o._createTime.nanoseconds)
              )
              // eslint-disable-next-line no-underscore-dangle,max-len
              const currentNoCompleteProposal = proposalNoComplete.find(
                (proposal) =>
                  proposal._createTime.nanoseconds === proposalReciente
              )

              if (typeof currentNoCompleteProposal === 'undefined') {
                return res.status(204).json({
                  oK: false,
                  message: 'there are no pending proposals',
                })
              }

              // eslint-disable-next-line no-underscore-dangle,guard-for-in,no-restricted-syntax
              for (const key in currentNoCompleteProposal._fieldsProto) {
                proposalData.uid = currentNoCompleteProposal.id
                // eslint-disable-next-line no-underscore-dangle,no-prototype-builtins
                if (
                  currentNoCompleteProposal._fieldsProto.hasOwnProperty(key)
                ) {
                  // eslint-disable-next-line no-underscore-dangle
                  if (
                    typeof currentNoCompleteProposal._fieldsProto[key]
                      .integerValue !== 'undefined'
                  ) {
                    // eslint-disable-next-line no-underscore-dangle
                    proposalData[key] = Number(
                      currentNoCompleteProposal._fieldsProto[key].integerValue
                    )
                    // eslint-disable-next-line no-underscore-dangle
                  } else if (
                    typeof currentNoCompleteProposal._fieldsProto[key]
                      .booleanValue !== 'undefined'
                  ) {
                    // eslint-disable-next-line no-underscore-dangle
                    proposalData[key] =
                      currentNoCompleteProposal._fieldsProto[key].booleanValue
                  } else {
                    // eslint-disable-next-line no-underscore-dangle
                    proposalData[key] =
                      currentNoCompleteProposal._fieldsProto[key].stringValue
                  }
                }
              }
              return res.status(200).json({ ok: true, proposal: proposalData })
            })
            .catch((err) => {
              throw err
            })
        } else {
          return res.status(204).json({ ok: false, message: 'No proposals' })
        }
      })
      .catch((err) => {
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

// eslint-disable-next-line consistent-return
const getOneProposal = async (req, res, next) => {
  try {
    const { id } = req.params
    let existProposalsInUser
    const data = {}
    const user = await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_USERS)
      .doc(req.user)
      .get()
      .catch((err) => {
        throw err
      })
    // eslint-disable-next-line no-underscore-dangle
    if (typeof user._fieldsProto === 'undefined') {
      return res.status(406).json({
        ok: false,
        message: 'non-existent user',
      })
    }
    if (user.id !== req.user) {
      return res.status(406).json({
        ok: false,
        message: 'you do not have permissions to perform this action',
      })
    }
    // eslint-disable-next-line no-underscore-dangle
    if (
      user._fieldsProto.proposalList &&
      user._fieldsProto.proposalList.arrayValue.values.length > 0
    ) {
      // eslint-disable-next-line max-len,no-underscore-dangle
      existProposalsInUser =
        user._fieldsProto.proposalList.arrayValue.values.find(
          (element) => element.stringValue === id
        )
      if (typeof existProposalsInUser !== 'undefined') {
        const { _fieldsProto } = await admin
          .firestore()
          .collection(process.env.COLLECTION_NAME_PROPOSAL)
          .doc(id)
          .get()
          .catch((err) => {
            throw err
          })
        // eslint-disable-next-line no-restricted-syntax
        for (const key in _fieldsProto) {
          // eslint-disable-next-line no-prototype-builtins
          if (_fieldsProto.hasOwnProperty(key)) {
            data[key] = _fieldsProto[key].stringValue
          }
        }
        return res.status(200).json({ ok: true, proposal: data })
      }
      return res.status(204).json({ ok: true, message: 'Proposal unknown' })
    }
    return res
      .status(204)
      .json({ ok: true, message: 'Does not have Proposal associates' })
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
 * @param {string} req.query.hash hash of the proposal to run a search
 * @param {string} req.query.page next page for pagination of documents by page
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 */

// eslint-disable-next-line consistent-return
const getAllHiddenProposal = async (req, res, next) => {
  try {
    const pageSize = 20
    const { hash } = req.query
    let { page } = req.query
    let documents
    if (typeof page === 'undefined' || page === '0') page = 1
    const proposalHash = []
    if (typeof hash !== 'undefined' || hash === '') {
      documents = await admin
        .firestore()
        .collection(process.env.COLLECTION_PROPOSAL_HIDDEN)
        .where('hash', '>=', hash)
        .where('hash', '<=', `${hash}\uf8ff`)
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .get()
    } else {
      documents = await admin
        .firestore()
        .collection(process.env.COLLECTION_PROPOSAL_HIDDEN)
        .orderBy('created_at', 'desc')
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .get()
        .catch((err) => {
          throw err
        })
    }

    const totalDocs = await admin
      .firestore()
      .collection(process.env.COLLECTION_PROPOSAL_HIDDEN)
      .get()

    // eslint-disable-next-line no-underscore-dangle
    const sizePerPage = documents._docs().length
    // eslint-disable-next-line no-underscore-dangle
    const totalPag = Math.ceil(totalDocs._docs().length / pageSize)

    const gobjectData = await clientRPC
      .callRpc('gobject_list')
      .call()
      .catch((err) => {
        throw err
      })

    // eslint-disable-next-line no-underscore-dangle,array-callback-return
    await documents._docs().map((elem) => {
      const newData = {}
      // eslint-disable-next-line no-underscore-dangle,no-restricted-syntax
      for (const key in elem._fieldsProto) {
        // eslint-disable-next-line no-underscore-dangle,no-prototype-builtins
        if (elem._fieldsProto.hasOwnProperty(key)) {
          newData.uid = elem.id
          // eslint-disable-next-line no-underscore-dangle
          newData.createTime = elem._createTime._seconds
          // eslint-disable-next-line no-underscore-dangle
          newData.hash = elem._fieldsProto.hash.stringValue
        }
      }
      proposalHash.push(newData)
    })

    // eslint-disable-next-line array-callback-return
    proposalHash.map((elem) => {
      // eslint-disable-next-line no-restricted-syntax
      for (const subKey in gobjectData) {
        // eslint-disable-next-line no-prototype-builtins
        if (gobjectData.hasOwnProperty(subKey)) {
          const key = gobjectData[subKey]
          if (elem.hash === subKey) {
            // eslint-disable-next-line no-param-reassign
            elem.extraInfoOfTheProposal = JSON.parse(key.DataString)
          }
        }
      }
    })

    // MED-008: Fix unhandled promise rejections - use Promise.all with proper error handling
    await Promise.all(
      proposalHash.map(async (e) => {
        const exist = Object.keys(gobjectData).find((elem) => elem === e.hash)
        if (typeof exist === 'undefined') {
          const i = proposalHash.indexOf(e)
          proposalHash.splice(i, 1)
          try {
            await admin
              .firestore()
              .collection(process.env.COLLECTION_PROPOSAL_HIDDEN)
              .doc(e.uid)
              .delete()
          } catch (err) {
            // Log error but don't fail entire operation
            console.error('Failed to delete hidden proposal:', err)
          }
        }
      })
    )
    proposalHash.sort((a, b) => a.createTime - b.createTime).reverse()
    return res.status(200).json({
      ok: true,
      pageSize,
      sizePerPage,
      // eslint-disable-next-line no-underscore-dangle
      totalRecords: totalDocs._docs().length,
      totalPag,
      currentPage: Number(page),
      previousPage: Number(page) - 1,
      nextPage: Number(page) + 1,
      proposalHash,
    })
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
// eslint-disable-next-line consistent-return
const createHiddenProposal = async (req, res, next) => {
  try {
    const { hash } = req.body
    if (!hash)
      return res.status(406).json({ ok: false, message: 'required fields' })
    if (hash.length !== 64) {
      return res
        .status(406)
        .json({ ok: false, message: 'invalid proposal hash' })
    }
    const isHidden = await admin
      .firestore()
      .collection(process.env.COLLECTION_PROPOSAL_HIDDEN)
      .where('hash', '==', hash)
      .get()
      .catch((err) => {
        throw err
      })
    if (isHidden.size > 0) {
      return res
        .status(200)
        .json({ ok: false, message: 'Proposal already hidden' })
    }

    const gobjectData = await clientRPC
      .callRpc('gobject_list')
      .call()
      .catch((err) => {
        throw err
      })

    const existingHash = Object.keys(gobjectData).find((e) => e === hash)

    if (typeof existingHash === 'undefined') {
      return res.status(406).json({
        ok: false,
        message: 'the proposal does not exist in the governance list',
      })
    }
    await admin
      .firestore()
      .collection(process.env.COLLECTION_PROPOSAL_HIDDEN)
      .add({
        hash,
        created_at: admin.firestore.Timestamp.now(),
      })
      .catch((err) => {
        throw err
      })
    return res.status(200).json({ ok: true, message: 'hash created' })
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
// eslint-disable-next-line consistent-return
const deleteHiddenProposal = async (req, res, next) => {
  try {
    const { hash } = req.params
    const isHidden = await admin
      .firestore()
      .collection(process.env.COLLECTION_PROPOSAL_HIDDEN)
      .get()
      .catch((err) => {
        throw err
      })

    // eslint-disable-next-line no-underscore-dangle
    const filterHash = isHidden
      ._docs()
      .find((doc) => doc._fieldsProto.hash.stringValue === hash)

    if (typeof filterHash === 'undefined') {
      return res.status(204).json({ ok: false, message: 'no exist proposal' })
    }

    await admin
      .firestore()
      .collection(process.env.COLLECTION_PROPOSAL_HIDDEN)
      .doc(filterHash.id)
      .delete()
      .catch((err) => {
        throw err
      })
    return res.status(200).json({ ok: true, message: 'hash removed' })
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

// eslint-disable-next-line consistent-return
const updateProposal = async (req, res, next) => {
  try {
    const { id } = req.params
    const { data } = req.body
    const newData = {}
    let respData = {}
    const prepareObjectProposal = {}
    let existProposalInUser
    const user = await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_USERS)
      .doc(req.user)
      .get()
      .catch((err) => {
        throw err
      })
    // eslint-disable-next-line no-underscore-dangle
    if (typeof user._fieldsProto === 'undefined') {
      return res.status(406).json({
        ok: false,
        message: 'non-existent user',
      })
    }
    if (user.id !== req.user) {
      return res.status(406).json({
        ok: false,
        message: 'you do not have permissions to perform this action',
      })
    }
    if (!data)
      return res.status(406).json({ ok: false, message: 'Required fields' })

    // eslint-disable-next-line prefer-const,max-len,no-underscore-dangle
    existProposalInUser = user._fieldsProto.proposalList.arrayValue.values.find(
      (element) => element.stringValue === id
    )

    if (typeof existProposalInUser === 'undefined') {
      return res.status(204).json({
        ok: false,
        message: 'non-existent proposal',
      })
    }

    // eslint-disable-next-line guard-for-in,no-restricted-syntax
    for (const key in data) {
      newData[key] = data[key]
    }

    // If hash is present and complete is true, call gobject_get with retry logic
    if (data.hash && data.complete === true) {
      const { hash } = data
      const maxRetryCount =
        typeof data.maxRetryCount === 'number' ? data.maxRetryCount : 30
      let attempt = 0
      let rpcSuccess = false
      let rpcResult
      const retryDelayMs = 10_000
      const maxDurationMs = 10 * 60 * 1000
      const startTime = Date.now()
      while (attempt < maxRetryCount && !rpcSuccess) {
        try {
          // eslint-disable-next-line no-await-in-loop
          rpcResult = await clientRPC.callRpc('gobject_get', [hash]).call()
          console.log({ gObjectResult: rpcResult })
          rpcSuccess = true
        } catch (rpcErr) {
          attempt += 1
          const elapsed = Date.now() - startTime
          if (elapsed >= maxDurationMs) {
            return res.status(408).json({
              ok: false,
              message:
                'Proposal submission failed. Please verify that the proposal is not displayed on the Governance page, and if not, try again in 5 minutes.',
            })
          }
          if (attempt >= maxRetryCount) {
            return res.status(500).json({
              ok: false,
              message: `Failed to verify proposal hash after ${maxRetryCount} attempts: ${rpcErr.message}`,
            })
          }
          // Wait 10 seconds before retrying
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
        }
      }
      // Optionally, you can do something with rpcResult if needed
    }

    await admin
      .firestore()
      .doc(`${process.env.COLLECTION_NAME_PROPOSAL}/${id}`)
      .update(newData)
      .catch((err) => {
        throw err
      })

    const proposal = await admin
      .firestore()
      .doc(`${process.env.COLLECTION_NAME_PROPOSAL}/${id}`)
      .get()
      .catch((err) => {
        throw err
      })

    // eslint-disable-next-line no-underscore-dangle,no-restricted-syntax
    for (const key in proposal._fieldsProto) {
      // eslint-disable-next-line no-underscore-dangle,no-prototype-builtins
      if (proposal._fieldsProto.hasOwnProperty(key)) {
        // eslint-disable-next-line no-underscore-dangle
        if (proposal._fieldsProto[key].integerValue) {
          // eslint-disable-next-line no-underscore-dangle
          respData[key] = proposal._fieldsProto[key].integerValue
        } else {
          // eslint-disable-next-line no-underscore-dangle
          respData[key] = proposal._fieldsProto[key].stringValue
        }
      }
    }

    // eslint-disable-next-line no-underscore-dangle
    if (proposal._fieldsProto.prepareObjectProposal) {
      // eslint-disable-next-line no-underscore-dangle,no-restricted-syntax
      for (const prepareKey in proposal._fieldsProto.prepareObjectProposal
        .mapValue.fields) {
        // eslint-disable-next-line no-underscore-dangle
        if (
          proposal._fieldsProto.prepareObjectProposal.mapValue.fields[
            prepareKey
          ].valueType === 'integerValue'
        ) {
          // eslint-disable-next-line no-underscore-dangle,max-len
          prepareObjectProposal[prepareKey] =
            proposal._fieldsProto.prepareObjectProposal.mapValue.fields[
              prepareKey
            ].integerValue
        } else {
          // eslint-disable-next-line no-underscore-dangle,max-len
          prepareObjectProposal[prepareKey] =
            proposal._fieldsProto.prepareObjectProposal.mapValue.fields[
              prepareKey
            ].stringValue
        }
      }
    }

    respData = { ...respData, prepareObjectProposal }
    return res.status(200).json({ ok: true, proposal: respData })
  } catch (err) {
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

// eslint-disable-next-line consistent-return
const deleteProposal = async (req, res, next) => {
  try {
    const { id } = req.params
    let existProposalInUser
    const proposals = []
    const user = await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_USERS)
      .doc(req.user)
      .get()
      .catch((err) => {
        throw err
      })
    // eslint-disable-next-line no-underscore-dangle
    if (typeof user._fieldsProto === 'undefined') {
      return res.status(406).json({
        ok: false,
        message: 'non-existent user',
      })
    }
    // eslint-disable-next-line no-underscore-dangle
    if (user._fieldsProto.proposalList.arrayValue.values.length > 0) {
      // eslint-disable-next-line no-underscore-dangle,max-len
      existProposalInUser =
        user._fieldsProto.proposalList.arrayValue.values.find(
          (element) => element.stringValue === id
        )
      if (typeof existProposalInUser !== 'undefined') {
        // eslint-disable-next-line no-underscore-dangle,array-callback-return
        user._fieldsProto.proposalList.arrayValue.values.map((proposal) => {
          proposals.push(proposal.stringValue)
        })
        const index = proposals.findIndex(
          (element) => element === existProposalInUser.stringValue
        )
        proposals.splice(index, 1)
        await admin
          .firestore()
          .doc(`${process.env.COLLECTION_NAME_USERS}/${req.user}`)
          .update('proposalList', proposals)
          .catch((err) => {
            throw err
          })
        await admin
          .firestore()
          .doc(`${process.env.COLLECTION_NAME_PROPOSAL}/${id}`)
          .delete()
          .catch((err) => {
            throw err
          })
        return res.status(200).json({ ok: true, message: 'Proposal Removed' })
      }
      return res.status(204).json({ ok: true, message: 'Proposal unknown' })
    }
    return res
      .status(204)
      .json({ ok: true, message: 'Does not have associated Proposals' })
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
  getProposalsPendingByUser,
}
