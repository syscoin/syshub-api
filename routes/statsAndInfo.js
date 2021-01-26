const express = require('express');
const {
  masterNodes, stats, countMasterNodes, list, info, getMiningInfo, getGovernanceInfo, getSuperBlockBudget, usersApp,
} = require('../controllers/statsAndInfo');

const router = express.Router();

router.get('/masternodes', masterNodes);
router.get('/count', countMasterNodes);
router.get('/list', list);
router.get('/getinfo', info);
router.get('/getmininginfo', getMiningInfo);
router.get('/getgovernanceinfo', getGovernanceInfo);
router.get('/getsuperblockbudget', getSuperBlockBudget);
router.get('/mnStats', stats);
router.get('/users', usersApp);

module.exports = router;
