const express = require('express')
const fbAuth = require('../middlewares/fbAuth')
const isAdmin = require('../middlewares/isAdmin')
const {
  getCurrentQuestions,
  getALlQuestions,
  getQuestions,
  createQuestions,
  updateQuestions,
  deleteQuestions,
} = require('../controllers/faq')

const router = express.Router()

router.get('/forall', getCurrentQuestions)
router.get('/', [fbAuth, isAdmin], getALlQuestions)
router.get('/:id', [fbAuth, isAdmin], getQuestions)
router.post('/', [fbAuth, isAdmin], createQuestions)
router.put('/:id', [fbAuth, isAdmin], updateQuestions)
router.delete('/:id', [fbAuth, isAdmin], deleteQuestions)

module.exports = router
