const express = require('express')
const { login, register } = require('../controllers/auth')
const { schemas, validate } = require('../utils/validators')

const router = express.Router()

router.post('/login', validate(schemas.login), login)
router.post('/register', validate(schemas.userId), register)

module.exports = router
