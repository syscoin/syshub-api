const express = require('express');
const {
  masterNodes, stats, countMasterNodes, list, info, getMiningInfo, getGovernanceInfo, getSuperBlockBudget,
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

module.exports = router;
