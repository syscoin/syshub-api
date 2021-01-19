const express = require('express');

const router = express.Router();
const {
  list,
  info,
  countMasterNodes,
  getAllVotingAddressByUser,
  getMiningInfo,
  createVotingAddress,
  updateVotingAddress,
  destroyVotingAddress,
  getGovernanceInfo,
  getSuperBlockBudget,
  getVotingAddress,
} = require('../controllers/address');

const fbAuth = require('../middlewares/fbAuth');

router.get('/count', countMasterNodes);
router.get('/list', list);
router.get('/getinfo', info);
router.get('/getmininginfo', getMiningInfo);
router.get('/getgovernanceinfo', getGovernanceInfo);
router.get('/getsuperblockbudget', getSuperBlockBudget);
router.get('/', [fbAuth], getAllVotingAddressByUser);
router.get('/:id', [fbAuth], getVotingAddress);
router.post('/', [fbAuth], createVotingAddress);
router.put('/:id', [fbAuth], updateVotingAddress);
router.delete('/:id', [fbAuth], destroyVotingAddress);

module.exports = router;
