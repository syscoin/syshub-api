const express = require('express')
const {
  check,
  prepare,
  vote,
  submit,
  getOneProposal,
  getProposalsPendingByUser,
  updateProposal,
  deleteProposal,
  getAllHiddenProposal,
  createHiddenProposal,
  deleteHiddenProposal,
} = require('../controllers/proposal')

const fbAuth = require('../middlewares/fbAuth')
const isAdmin = require('../middlewares/isAdmin')
const { schemas, validate, validateQuery } = require('../utils/validators')

const router = express.Router()

router.get('/:id', [fbAuth], getOneProposal)
router.get('/pending/recover', [fbAuth], getProposalsPendingByUser)
router.post('/check', [fbAuth, validate(schemas.proposal)], check)
router.post('/prepare', [fbAuth, validate(schemas.proposal)], prepare)
router.put('/submit/:id', [fbAuth], submit)
router.post('/vote', [fbAuth], vote)
router.put('/:id', [fbAuth], updateProposal)
router.delete('/:id', [fbAuth], deleteProposal)
router.get('/hiddenproposal/all', [fbAuth, isAdmin, validateQuery(schemas.queryHash)], getAllHiddenProposal)
router.post('/hiddenproposal', [fbAuth, isAdmin, validate(schemas.hash)], createHiddenProposal)
router.delete('/hiddenproposal/:hash', [fbAuth, isAdmin], deleteHiddenProposal)

module.exports = router
