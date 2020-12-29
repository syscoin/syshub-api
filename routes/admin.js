const express = require('express');
const {getAllAdmins, createAdmin, updateAdmin, deleteAdmin} = require('../controllers/admin');
const fbAuth = require('../middlewares/fbAuth');
const isAdmin = require('../middlewares/isAdmin');
const router = express.Router();

router.get('/', [fbAuth, isAdmin], getAllAdmins);
router.post('/', [fbAuth, isAdmin], createAdmin);
router.put('/:id', [fbAuth, isAdmin], updateAdmin);
router.delete('/:id', [fbAuth, isAdmin], deleteAdmin);

module.exports = router
