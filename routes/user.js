const express = require('express');
const {
  getAllUser,
  getOneUser,
  getUser2fa,
  updateUser,
  updateActionsUser,
  deleteUser,
} = require('../controllers/user');
const fbAuth = require('../middlewares/fbAuth');
const isAdmin = require('../middlewares/isAdmin');

const router = express.Router();

router.get('/', [fbAuth, isAdmin], getAllUser);
router.get('/verify2fa/:id', getUser2fa);
router.get('/:id', fbAuth, getOneUser);
router.put('/extend/:id', fbAuth, updateActionsUser);
router.put('/:id', fbAuth, updateUser);
router.delete('/:id', fbAuth, deleteUser);

module.exports = router;