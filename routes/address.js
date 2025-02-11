const express = require('express')

const router = express.Router()
const {
  getAllVotingAddressByUser,
  createVotingAddress,
  updateVotingAddress,
  destroyVotingAddress,
  getVotingAddress,
} = require('../controllers/address')

const fbAuth = require('../middlewares/fbAuth')

router.get('/', [fbAuth], getAllVotingAddressByUser)
router.get('/:id', [fbAuth], getVotingAddress)
router.post('/', [fbAuth], createVotingAddress)
router.put('/:id', [fbAuth], updateVotingAddress)
router.delete('/:id', [fbAuth], destroyVotingAddress)

module.exports = router
