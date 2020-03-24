var express = require('express');
var router = express.Router();
var shell = require('shelljs');
const gcmd = 'syscoin-cli gobject';
const syscoinCli = 'syscoin-cli ';
const exec = require('child-process-promise').exec;
const cors = require('cors');
var Bitcoin = require('bitcoinjs-lib');
var Int64LE = require('int64-buffer').Int64LE;
const secp256k1 = require('secp256k1');
const { swapEndiannessInPlace, swapEndianness } = require('buffer-math');

router.use(cors());

/* GET home page and checks. */
router.get('/', function(req, res, next) {
  res.render('index.hjs', { title: 'Syshub-api' });
});

router.get('/createzone', function(req, res, next) {
  res.render('createzone.hjs', null);
});

router.get('/createcomment', function(req, res, next) {
  res.render('createcomment.hjs', null);
});

router.get('/check', function(req, res) {
  res.send({ status: 'true', message: 'API server up and running' });
});

/* API for Syscoin node */
router.get('/list', function(req, res) {
  var exec = gcmd + ' list ';
  shell.exec(exec, function(code, stdout, stderr) {
    if (!code) {
      res.send(stdout);
    } else {
      res.send(stderr);
    }
  });
});

router.post('/cmd', function(req, res) {
  var script = req.body.script;
  var exec = syscoinCli + script;

  shell.exec(exec, function(code, stdout, stderr) {
    if (!code) {
      res.send(stdout);
    } else {
      res.send(stderr);
    }
  });
});

router.post('/check', function(req, res) {
  var dataHex = req.body.dataHex;
  var exec = gcmd + ' check ' + dataHex;
  shell.exec(exec, function(code, stdout, stderr) {
    if (!code) {
      res.send(stdout);
    } else {
      res.send(stderr);
    }
  });
});

router.post('/prepare', function(req, res) {
  const parentHash = req.body.parentHash;
  const revision = req.body.revision;
  const time = req.body.time;
  var dataHex = req.body.dataHex;

  var exec =
    'gobject prepare ' +
    parentHash +
    ' ' +
    revision +
    ' ' +
    time +
    ' ' +
    dataHex;
  res.send(exec);
});

router.post('/submit', function(req, res) {
  const parentHash = req.body.parentHash;
  const revision = req.body.revision;
  const time = req.body.time;
  const dataHex = req.body.dataHex;
  const txid = req.body.txid;

  let exec =
    'gobject submit ' +
    parentHash +
    ' ' +
    revision +
    ' ' +
    time +
    ' ' +
    dataHex +
    ' ' +
    txid;
  res.send(exec);
});

router.get('/curl', function(req, res) {
  return exec(`curl ${req.query.url}`)
    .then(response =>
      res.status(200).json({ err: null, data: response.stdout })
    )
    .catch(err => res.status(204).json({ err }));
});

router.post('/vote', function(req, res) {
  var mnPrivateKey = req.body.mnPrivateKey;
  var vinMasternode = req.body.vinMasternode;
  var time = Math.floor(Date.now() / 1000);
  var gObjectHashBuffer = Buffer.from(req.body.gObjectHash, 'hex');
  var voteSignalNum = 1; // 'funding'
  var voteOutcomeNum = req.body.voteOutcome; // 1 for yes. 2 for no. 0 for abstain

  var masterNodeTx = vinMasternode.split('-');

  var vinMasternodeBuffer = Buffer.from(masterNodeTx[0], 'hex');
  swapEndiannessInPlace(vinMasternodeBuffer);

  const vinMasternodeIndexBuffer = Buffer.allocUnsafe(4);
  var outputIndex = parseInt(masterNodeTx[1]);
  vinMasternodeIndexBuffer.writeInt32LE(outputIndex);

  var gObjectHashBufferLE = swapEndianness(gObjectHashBuffer);

  const voteOutcomeBuffer = Buffer.allocUnsafe(4);
  voteOutcomeBuffer.writeInt32LE(voteOutcomeNum);

  const voteSignalBuffer = Buffer.allocUnsafe(4);
  voteSignalBuffer.writeInt32LE(voteSignalNum);

  var timeBuffer = new Int64LE(time).toBuffer();
  var message = Buffer.concat([
    vinMasternodeBuffer,
    vinMasternodeIndexBuffer,
    gObjectHashBufferLE,
    voteOutcomeBuffer,
    voteSignalBuffer,
    timeBuffer
  ]);

  var hash = Bitcoin.crypto.hash256(message);
  var keyPair = Bitcoin.ECPair.fromWIF(mnPrivateKey);
  const sigObj = secp256k1.sign(hash, keyPair.privateKey);

  var recId = 0;
  recId = 27 + sigObj.recovery + (keyPair.compressed ? 4 : 0);

  const recIdBuffer = Buffer.allocUnsafe(1);
  recIdBuffer.writeInt8(recId);
  var rawSignature = Buffer.concat([recIdBuffer, sigObj.signature]);
  var signature = rawSignature.toString('base64');

  var vote;
  var signal;

  // Note: RPC command uses english, signed vote message uses numbers
  if (voteSignalNum == 0) signal = 'none';
  if (voteSignalNum == 1) signal = 'funding'; // -- fund this object for it's stated amount
  if (voteSignalNum == 2) signal = 'valid'; //   -- this object checks out in sentinel engine
  if (voteSignalNum == 3) signal = 'delete'; //  -- this object should be deleted from memory entirely
  if (voteSignalNum == 4) signal = 'endorsed'; //   -- officially endorsed by the network somehow (delegation)

  if (voteOutcomeNum == 0) vote = 'none';
  if (voteOutcomeNum == 1) vote = 'yes';
  if (voteOutcomeNum == 2) vote = 'no';
  if (voteOutcomeNum == 3) vote = 'abstain';

  // voteraw masternode-tx-hash masternode-tx-index governance-hash vote-signal [yes|no|abstain] time vote-sig
  var rpcCommand =
    'voteraw ' +
    masterNodeTx[0] +
    ' ' +
    masterNodeTx[1] +
    ' ' +
    gObjectHashBuffer.toString('hex') +
    ' ' +
    signal +
    ' ' +
    vote +
    ' ' +
    time +
    ' ' +
    signature;

  var exec = syscoinCli + rpcCommand;

  shell.exec(exec, function(code, stdout, stderr) {
    if (!code) {
      res.send(stdout);
    } else {
      res.send(stderr);
    }
  });
});

router.get('/getinfo', function(req, res) {
  var exec = syscoinCli + ' getblockchaininfo ';
  shell.exec(exec, function(code, stdout, stderr) {
    if (!code) {
      res.send(stdout);
    } else {
      res.send(stderr);
    }
  });
});

router.get('/getmininginfo', function(req, res) {
  var exec = syscoinCli + ' getmininginfo ';
  shell.exec(exec, function(code, stdout, stderr) {
    if (!code) {
      res.send(stdout);
    } else {
      res.send(stderr);
    }
  });
});

router.get('/getgovernanceinfo', function(req, res) {
  var exec = syscoinCli + ' getgovernanceinfo ';
  shell.exec(exec, function(code, stdout, stderr) {
    if (!code) {
      res.send(stdout);
    } else {
      res.send(stderr);
    }
  });
});

router.get('/getsuperblockbudget', async (req, res) => {
  const getGovernanceInfo = syscoinCli + ' getgovernanceinfo ';
  shell.exec(getGovernanceInfo, async (code, stdout, stderr) => {
    if (!code) {
      const governanceInfo = JSON.parse(stdout);
      const lsb = governanceInfo.lastsuperblock;
      const nsb = governanceInfo.nextsuperblock;
      const getLastSuperBlockBudget = `${syscoinCli} getsuperblockbudget ${lsb}`;
      const getNextSuperBlockBudget = `${syscoinCli} getsuperblockbudget ${nsb}`;

      shell.exec(getLastSuperBlockBudget, (lsbCode, lsbStdout, lsbStderr) => {
        if (!lsbCode) {
          shell.exec(
            getNextSuperBlockBudget,
            (nsbCode, nsbStdout, nsbStderr) => {
              if (!nsbCode) {
                const lsbBudget = lsbStdout.split('\n')[0];
                const nsbBudget = nsbStdout.split('\n')[0];
                console.log(lsbBudget, nsbBudget);
                res.json([
                  { block: lsb, budget: lsbBudget },
                  { block: nsb, budget: nsbBudget }
                ]);
              } else {
                res.send(nsbStderr);
              }
            }
          );
        } else {
          res.send(lsbStderr);
        }
      });
      await shell.exec(
        getNextSuperBlockBudget,
        (nsbCode, nsbStdout, nsbStderr) => {
          if (!nsbCode) {
            nsbBudget = nsbStdout;
          } else {
            res.send(nsbStderr);
          }
        }
      );
      console.log(lsbBudget, nsbBudget);
      res.json({ lsb, nsb, a: lsbBudget, b: nsbBudget });
    } else {
      res.send(stderr);
    }
  });
});

module.exports = router;
