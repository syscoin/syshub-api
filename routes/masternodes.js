const express = require('express')
const {
  prepareMn,
  signmessage,
  submitMn,
} = require('../controllers/masternodes')

const router = express.Router()

router.post('/prepare', prepareMn)
router.post('/signmessage', signmessage)
router.post('/submit', submitMn)

module.exports = router
