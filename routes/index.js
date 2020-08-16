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
const {swapEndiannessInPlace, swapEndianness} = require('buffer-math');

router.use(cors());

/* GET home page and checks. */
router.get('/', function (req, res, next) {
  res.render('index.hjs', {title: 'Syshub-api'});
});

router.get('/createzone', function (req, res, next) {
  res.render('createzone.hjs', null);
});

router.get('/createcomment', function (req, res, next) {
  res.render('createcomment.hjs', null);
});

router.get('/check', function (req, res) {
  res.send({status: 'true', message: 'API server up and running'});
});

/* API for Syscoin node */
router.get('/list', function (req, res) {
  var exec = gcmd + ' list ';
  shell.exec(exec, function (code, stdout, stderr) {
    if (!code) {
      res.send(stdout);
    } else {
      res.send(stderr);
    }
  });
});

router.post('/cmd', function (req, res) {
  var script = req.body.script;
  var exec = syscoinCli + script;

  shell.exec(exec, function (code, stdout, stderr) {
    if (!code) {
      res.send(stdout);
    } else {
      res.send(stderr);
    }
  });
});

router.post('/check', function (req, res) {
  var dataHex = req.body.dataHex;
  var exec = gcmd + ' check ' + dataHex;
  shell.exec(exec, function (code, stdout, stderr) {
    if (!code) {
      res.send(stdout);
    } else {
      res.send(stderr);
    }
  });
});

router.post('/prepare', function (req, res) {
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

router.post('/submit', function (req, res) {
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

router.get('/curl', function (req, res) {
  return exec(`curl ${req.query.url}`)
    .then(response =>
      res.status(200).json({err: null, data: response.stdout})
    )
    .catch(err => res.status(204).json({err}));
});

router.post('/vote', function (req, res) {
  const {
    txHash,
    txIndex,
    governanceHash,
    signal,
    vote,
    time,
    signature
  } = req.body

  // voteraw masternode-tx-hash masternode-tx-index governance-hash vote-signal [yes|no|abstain] time vote-sig
  var rpcCommand =
    'voteraw ' +
    txHash +
    ' ' +
    txIndex +
    ' ' +
    governanceHash +
    ' ' +
    signal +
    ' ' +
    vote +
    ' ' +
    time +
    ' ' +
    signature;

  var exec = syscoinCli + rpcCommand;

  shell.exec(exec, function (code, stdout, stderr) {
    if (!code) {
      res.send(stdout);
    } else {
      res.send(stderr);
    }
  });
});

router.get('/getinfo', function (req, res) {
  var exec = syscoinCli + ' getblockchaininfo ';
  shell.exec(exec, function (code, stdout, stderr) {
    if (!code) {
      res.send(stdout);
    } else {
      res.send(stderr);
    }
  });
});

router.get('/getmininginfo', function (req, res) {
  var exec = syscoinCli + ' getmininginfo ';
  shell.exec(exec, function (code, stdout, stderr) {
    if (!code) {
      res.send(stdout);
    } else {
      res.send(stderr);
    }
  });
});

router.get('/getgovernanceinfo', function (req, res) {
  var exec = syscoinCli + ' getgovernanceinfo ';
  shell.exec(exec, function (code, stdout, stderr) {
    if (!code) {
      res.send(stdout);
    } else {
      res.send(stderr);
    }
  });
});

router.get('/getsuperblockbudget', async (req, res) => {
  try {
    const getGovernanceInfo = syscoinCli + ' getgovernanceinfo ';
    let governanceInfo;
    let lsb;
    let nsb;
    let getLastSuperBlockBudget;
    let getNextSuperBlockBudget;
    let lsbBudget;
    let nsbBudget;
    shell.exec(getGovernanceInfo, async (code, stdout, stderr) => {
      if (!code) {
        governanceInfo = JSON.parse(stdout);
        lsb = governanceInfo.lastsuperblock;
        nsb = governanceInfo.nextsuperblock;
        getLastSuperBlockBudget = `${syscoinCli} getsuperblockbudget ${lsb}`;
        getNextSuperBlockBudget = `${syscoinCli} getsuperblockbudget ${nsb}`;
        shell.exec(getLastSuperBlockBudget, (lsbCode, lsbStdout, lsbStderr) => {
          if (!lsbCode) {
            shell.exec(getNextSuperBlockBudget, (nsbCode, nsbStdout, nsbStderr) => {
              if (!nsbCode) {
                lsbBudget = lsbStdout.split('\n')[0];
                nsbBudget = nsbStdout.split('\n')[0];
                res.json([{block: lsb, budget: lsbBudget}, {block: nsb, budget: nsbBudget}]);
              } else {
                res.send(nsbStderr);
              }
            });
          } else {
            res.send(lsbStderr);
          }
        });
        /**
         * error when answering twice, the code is from the old controller structure, it seems unnecessary
         * **/
        // await shell.exec(getNextSuperBlockBudget, (nsbCode, nsbStdout, nsbStderr) => {
        //   if (!nsbCode) {
        //     nsbBudget = nsbStdout;
        //   } else {
        //      res.send(nsbStderr);
        //   }
        //    res.json({lsb, nsb, a: lsbBudget, b: nsbBudget});
        // })
      } else {
        res.send(stderr);
      }
    })
  } catch (err) {
    return res.json(err)
  }


  /**
   * previous code with error
   **/

  // const getGovernanceInfo = syscoinCli + ' getgovernanceinfo ';
  // shell.exec(getGovernanceInfo, async (code, stdout, stderr) => {
  //   if (!code) {
  //     const governanceInfo = JSON.parse(stdout);
  //     const lsb = governanceInfo.lastsuperblock;
  //     const nsb = governanceInfo.nextsuperblock;
  //     const getLastSuperBlockBudget = `${syscoinCli} getsuperblockbudget ${lsb}`;
  //     const getNextSuperBlockBudget = `${syscoinCli} getsuperblockbudget ${nsb}`;
  //
  //     shell.exec(getLastSuperBlockBudget, (lsbCode, lsbStdout, lsbStderr) => {
  //       if (!lsbCode) {
  //         shell.exec(
  //           getNextSuperBlockBudget,
  //           (nsbCode, nsbStdout, nsbStderr) => {
  //             if (!nsbCode) {
  //               const lsbBudget = lsbStdout.split('\n')[0];
  //               const nsbBudget = nsbStdout.split('\n')[0];
  //               console.log(lsbBudget, nsbBudget);
  //               res.json([
  //                 { block: lsb, budget: lsbBudget },
  //                 { block: nsb, budget: nsbBudget }
  //               ]);
  //             } else {
  //               res.send(nsbStderr);
  //             }
  //           }
  //         );
  //       } else {
  //         res.send(lsbStderr);
  //       }
  //     });
  //     await shell.exec(
  //       getNextSuperBlockBudget,
  //       (nsbCode, nsbStdout, nsbStderr) => {
  //         if (!nsbCode) {
  //           nsbBudget = nsbStdout;
  //         } else {
  //           res.send(nsbStderr);
  //         }
  //       }
  //     );
  //     console.log(lsbBudget, nsbBudget);
  //     res.json({ lsb, nsb, a: lsbBudget, b: nsbBudget });
  //   } else {
  //     res.send(stderr);
  //   }
  // });
});

module.exports = router;
