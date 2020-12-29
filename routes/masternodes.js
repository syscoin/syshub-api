let express = require('express');
let router = express.Router();
const {
    list,
    info,
    countMasterNodes,
    getAllMasterNodesByUser,
    getMiningInfo,
    createMasterNode,
    updateMaterNode,
    destroyMasterNode,
    getGovernanceInfo,
    getSuperBlockBudget,
    getMasterNode
} = require('../controllers/masternode');

const fbAuth = require('../middlewares/fbAuth');

router.get('/count', countMasterNodes);
router.get('/list', list)
router.get('/getinfo', info);
router.get('/getmininginfo', getMiningInfo);
router.get('/getgovernanceinfo', getGovernanceInfo);
router.get('/getsuperblockbudget', getSuperBlockBudget);
router.get('/', [fbAuth], getAllMasterNodesByUser)
// router.post('/voteIn/:id', fbAuth, masterNodeVoteIn)
router.get('/:id', [fbAuth], getMasterNode)
router.post('/', [fbAuth], createMasterNode);
router.put('/:id', [fbAuth], updateMaterNode);
router.delete('/:id', [fbAuth], destroyMasterNode);


module.exports = router;
