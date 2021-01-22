const axios = require('axios');
const moment = require('moment');
const numeral = require('numeral');
const countries = require('i18n-iso-countries');
const geoip = require('geoip-country');

const ms = require('pretty-ms');
const { rgbToHex } = require('../utils/helpers');
// const { checkBodyEmpty } = require('../utils/helpers');
const { clientRPC, admin } = require('../utils/config');

// eslint-disable-next-line consistent-return
const masterNodes = async (req, res, next) => {
  try {
    const {
      page, sortBy, sortDesc, perPage,
    } = req.query;
    let { search } = req.query;
    if (typeof search !== 'undefined') {
      search.replace(/ /g, '');
    } else {
      search = '';
    }

    const masternodesArr = [];
    let perPageDefault;
    let newSearch = '';
    const filteredMN = [];
    const vracajARR = [];

    if (perPage > 90 || perPage < 1) {
      perPageDefault = 30;
    } else {
      perPageDefault = perPage;
    }

    if (search.includes(':')) {
      // eslint-disable-next-line prefer-destructuring
      newSearch = search.split(':')[0];
    } else {
      newSearch = search;
    }
    const mns = await clientRPC.callRpc('masternode_list').call().catch((err) => {
      throw err;
    });

    Object.keys(mns).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(mns, key)) {
        masternodesArr.push(mns[key]);
      }
    });

    for (const masternode of masternodesArr) { // search filter
      if (masternode.address.split(':')[0].includes(newSearch)
        || masternode.payee.toUpperCase().includes(newSearch.toUpperCase())) {
        const pushObj = { ...masternode };
        if (pushObj.lastpaidtime === 0) {
          pushObj.lastpaidtimeS = -Infinity;
          pushObj.lastpaidtime = 'Never Paid';
        } else {
          pushObj.lastpaidtimeS = pushObj.lastpaidtime;
          pushObj.lastpaidtime = moment.unix(pushObj.lastpaidtime).fromNow();
        }
        // pushObj.lastseenS = pushObj.lastseen;
        // pushObj.lastseen = moment.unix(pushObj.lastseen).fromNow();
        // if (pushObj.activeseconds < 0) {
        //   pushObj.activeseconds = 0;
        // }
        // pushObj.activesecondsS = pushObj.activeseconds;
        // pushObj.activeseconds = ms(pushObj.activeseconds * 1000);
        // if (pushObj.activeseconds.includes('d')) {
        //   pushObj.activeseconds = `${pushObj.activeseconds.split('m')[0]}m`;
        // }
        filteredMN.push(pushObj);
      }
    }
    // if (sortBy === 'lastSeen') {
    //   filteredMN.sort((a, b) => a.lastseenS - b.lastseenS);
    // }
    // else if (sortBy === 'activeTime') {
    //   filteredMN.sort((a, b) => a.activesecondsS - b.activesecondsS);
    // }else
    if (sortBy === 'lastPayment') {
      filteredMN.sort((a, b) => a.lastpaidtimeS - b.lastpaidtimeS);
    } else {
      filteredMN.sort((a, b) => {
        if (a[sortBy] < b[sortBy]) return -1;
        if (a[sortBy] > b[sortBy]) return 1;
        return 0;
      });
    }
    if (sortDesc) {
      filteredMN.reverse();
    }
    for (let i = (perPageDefault * (page - 1)); i < (perPageDefault * page); i += 1) {
      if (typeof filteredMN[i] !== 'undefined') {
        vracajARR.push(filteredMN[i]);
      }
    }

    return res.status(200).json({ returnArr: vracajARR, mnNumb: filteredMN.length });
  } catch (err) {
    next(err);
  }
};

/**
 * @function
 * @name countMasterNodes
 * @desc prints the number of all known masternodes.
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 * @example
 * {
    "total": 2067,
    "enabled": 1917,
    "qualify": 1870
    }
 */
// eslint-disable-next-line consistent-return
const countMasterNodes = async (req, res, next) => {
  try {
    const nMasterNodes = await clientRPC
      .callRpc('masternode_count')
      .call(true)
      .catch((err) => {
        throw err;
      });
    return res.status(200).json({ ok: true, nMasterNodes });
  } catch (err) {
    next(err);
  }
};

/**
 * @function
 * @name list
 * @desc lists governance objects
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {function} next errors caught and sent
 *
 * @return {array} positive answer
 *
 * @example
 *  {
        "Hash": "16b85f92352efabf32fbdd986c41ccd884f511909db70679e22318f378b7ec7c",
        "ColHash": "0000000000000000000000000000000000000000000000000000000000000000",
        "ObectType": 2,
        "CreationTime": 1606531853,
        "AbsoluteYesCount": 1757,
        "YesCount": 1757,
        "NoCount": 0,
        "AbstainCount": 0,
        "fBlockchainValidity": true,
        "IsValidReason": "",
        "fCachedValid": true,
        "fCachedFunding": true,
        "fCachedDelete": false,
        "fCachedEndorsed": false,
        "event_block_height": 788400,
        "payment_addresses": "sys1qvmhjxn8kaufe0mmf88edy77gcq3c4z4ggm43zc|sys1qnmp9aew5x2djeld2w7m8c97t8a3497d5f4c3yc|sys1q5hjkux3c3ghvxdmhhzw2pdznm8ejwzna9khd9n|sys1qwjs7acmk07xtwgrr36e4dtcvngp7c7ckskd2z3",
        "payment_amounts": "4567.00000000|200000.00000000|235000.00000000|64217.00000000",
        "proposal_hashes": "f4e517aa1039561c4338ce261bbfa463167434a87c212b38006fe217342a55e1|de8c4f42d74dd6934cb0738a289d874f1cd3cfba22b969fddb7409a0c24ed6b1|d629153f5262e0ff896671eaa1860b651a3a3945dee1608c639c52020cc0bf07|0a63e563fe0cde738c8f45facf3d2f82d6370ff3696798381d9a7988e4b2c849",
        "type": 2
    },
 {
        "Hash": "f4e517aa1039561c4338ce261bbfa463167434a87c212b38006fe217342a55e1",
        "ColHash": "1a2439df7f24588845cd1f369b4144d4bc087c0830374ba6f3eef019026f68ba",
        "ObectType": 1,
        "CreationTime": 1606040805,
        "AbsoluteYesCount": 416,
        "YesCount": 468,
        "NoCount": 52,
        "AbstainCount": 0,
        "fBlockchainValidity": true,
        "IsValidReason": "",
        "fCachedValid": true,
        "fCachedFunding": true,
        "fCachedDelete": false,
        "fCachedEndorsed": false,
        "type": 1,
        "name": "extendingsyslinksnov",
        "title": "Extending Syslinks November",
        "description": "",
        "nPayment": 6,
        "first_epoch": 1606040805,
        "start_epoch": 1606040805,
        "end_epoch": 1621679205,
        "payment_address": "sys1qvmhjxn8kaufe0mmf88edy77gcq3c4z4ggm43zc",
        "payment_amount": 4567,
        "url": "https://support.syscoin.org/t/2020-11-12-extending-syslinks/321"
    },
 */
// eslint-disable-next-line consistent-return
const list = async (req, res, next) => {
  try {
    const proposals = [];
    const hiddenProposal = [];
    const proposalResp = [];

    const listProposalsHidden = await admin.firestore()
      .collection(process.env.COLLECTION_PROPOSAL_HIDDEN)
      .get()
      .catch((err) => {
        throw err;
      });

    // eslint-disable-next-line no-underscore-dangle,array-callback-return
    listProposalsHidden._docs().map((doc) => {
      // eslint-disable-next-line no-underscore-dangle
      hiddenProposal.push(doc._fieldsProto.hash.stringValue);
    });

    const gObjectList = await clientRPC
      .callRpc('gobject_list')
      .call()
      .catch((err) => {
        throw err;
      });

    // eslint-disable-next-line no-restricted-syntax
    for (const gObjectListKey in gObjectList) {
      // eslint-disable-next-line no-prototype-builtins
      if (gObjectList.hasOwnProperty(gObjectListKey)) {
        const key = gObjectList[gObjectListKey];
        const bb = !JSON.parse(key.DataString)[0] ? JSON.parse(key.DataString) : JSON.parse(key.DataString)[0][1];
        const { Hash } = key;
        const ColHash = key.CollateralHash;
        const { ObjectType } = key;
        const { CreationTime } = key;
        const { AbsoluteYesCount } = key;
        const { YesCount } = key;
        const { NoCount } = key;
        const { AbstainCount } = key;
        const { fBlockchainValidity } = key;
        const { IsValidReason } = key;
        const { fCachedValid } = key;
        const { fCachedFunding } = key;
        const { fCachedDelete } = key;
        const { fCachedEndorsed } = key;

        const govList = {
          Hash,
          ColHash,
          ObjectType,
          CreationTime,
          AbsoluteYesCount,
          YesCount,
          NoCount,
          AbstainCount,
          fBlockchainValidity,
          IsValidReason,
          fCachedValid,
          fCachedFunding,
          fCachedDelete,
          fCachedEndorsed,
        };

        proposals.push({ ...govList, ...bb });
        proposals.sort((a, b) => ((a.AbsoluteYesCount < b.AbsoluteYesCount) ? 1 : -1));
      }
    }
    // eslint-disable-next-line array-callback-return
    proposals.map((elem) => {
      const hidden = hiddenProposal.find((el) => el === elem.Hash);
      if (typeof hidden === 'undefined') {
        proposalResp.push(elem);
      }
    });

    return res.status(200).json(proposalResp);
  } catch (err) {
    next(err);
  }
};

/**
 * @function
 * @name info
 * @desc provides information about the current state of the block chain.
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {function} next errors caught and sent
 *
 * @return {number} positive answer
 * @example 367.20
 */

// eslint-disable-next-line consistent-return
const info = async (req, res, next) => {
  try {
    // eslint-disable-next-line no-shadow
    const info = await clientRPC
      .callRpc('getblockchaininfo')
      .call(true)
      .catch((err) => {
        throw err;
      });

    return res.status(200).json({ ok: true, BlockChainInfo: info });
  } catch (err) {
    next(err);
  }
};

/**
 * @function
 * @name getMiningInfo
 * @desc returns various mining-related information.
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 *
 * @example
 * {
      "blocks": 292979,
      "currentblocksize": 0,
      "currentblocktx": 0,
      "difficulty": 0.0002441371325370145,
      "networkhashps": 3805.856874962192,
      "pooledtx": 0,
      "chain": "test",
      "warnings": "Warning: unknown new rules activated (versionbit 3)"
    }
 */
// eslint-disable-next-line consistent-return
const getMiningInfo = async (req, res, next) => {
  try {
    // eslint-disable-next-line no-shadow
    const getMiningInfo = await clientRPC
      .callRpc('getmininginfo')
      .call(true)
      .catch((err) => {
        throw err;
      });

    return res.status(200).json(getMiningInfo);
  } catch (err) {
    next(err);
  }
};

/**
 * @function
 * @name getGovernanceInfo
 * @desc returns an object containing governance parameters.
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 *
 * @example
 * {
    "governanceminquorum": 1,
    "proposalfee": 5.00000000,
    "superblockcycle": 24,
    "lastsuperblock": 250824,
    "nextsuperblock": 250848
    }
 */
// eslint-disable-next-line consistent-return
const getGovernanceInfo = async (req, res, next) => {
  try {
    // eslint-disable-next-line no-shadow
    const getGovernanceInfo = await clientRPC
      .callRpc('getgovernanceinfo')
      .call()
      .catch((err) => {
        throw err;
      });
    return res.status(200).json(getGovernanceInfo);
  } catch (err) {
    next(err);
  }
};

/**
 * @function
 * @name getSuperBlockBudget
 * @desc returns the absolute maximum sum of superblock payments allowed.
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {function} next errors caught and sent
 *
 * @return {number} positive answer
 * @example The absolute maximum sum of superblock payments allowed, in SYS
 */

// eslint-disable-next-line consistent-return
const getSuperBlockBudget = async (req, res, next) => {
  try {
    // eslint-disable-next-line no-shadow
    const getGovernanceInfo = await clientRPC
      .callRpc('getgovernanceinfo')
      .call()
      .catch((err) => {
        throw err;
      });

    const { lastsuperblock, nextsuperblock } = getGovernanceInfo;

    const getSuperBlockBudgetLast = await clientRPC
      .callRpc('getsuperblockbudget', [lastsuperblock])
      .call(true)
      .catch((err) => {
        throw err;
      });

    const getSuperBlockBudgetNext = await clientRPC
      .callRpc('getsuperblockbudget', [nextsuperblock])
      .call(true)
      .catch((err) => {
        throw err;
      });

    const lbs = { block: lastsuperblock, budget: getSuperBlockBudgetLast };
    const nbs = { block: nextsuperblock, budget: getSuperBlockBudgetNext };
    return res.status(200).json({ ok: true, lbs, nbs });
  } catch (err) {
    next(err);
  }
};

// eslint-disable-next-line consistent-return
const stats = async (req, res, next) => {
  try {
    const hashGenesis = process.env.HASHGENESIS;
    const mapData = {};
    let highestMN = 0;
    const mapFills = { defaultFill: '#e8e8e8' };
    const mnInfo = {
      totalMasternodes: 0,
      enabled: 0,
      sentinelPingExpired: 0,
      newStartRequired: 0,
      expired: 0,
    };

    for (let i = 255; i >= 0; i -= 1) {
      mapFills[`heat${i}`] = rgbToHex(0, 255 - i, 255);
    }

    const mns = await clientRPC.callRpc('masternode_list').call().catch((err) => {
      throw err;
    });

    mnInfo.totalMasternodes = Object.keys(mns).length;
    Object.keys(mns).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(mns, key)) {
        if (mns[key].status === 'ENABLED') {
          mnInfo.enabled += 1;
        } else if (mns[key].status === 'SENTINEL_PING_EXPIRED') {
          mnInfo.sentinelPingExpired += 1;
        } else if (mns[key].status === 'NEW_START_REQUIRED') {
          mnInfo.newStartRequired += 1;
        } else if (mns[key].status === 'EXPIRED') {
          mnInfo.expired += 1;
        }
      }
      if (geoip.lookup(mns[key].address.split(':')[0]) != null) {
        const iso = geoip.lookup(mns[key].address.split(':')[0]).country;
        const alpha3 = countries.alpha2ToAlpha3(iso);
        if (mapData[alpha3] === undefined) {
          mapData[alpha3] = {
            masternodes: 1,
          };
        } else {
          mapData[alpha3].masternodes += 1;
        }
      }
    });

    for (const country in mapData) {
      if (mapData[country].masternodes > highestMN) {
        highestMN = mapData[country].masternodes;
      }
    }
    for (const country in mapData) {
      const heatLevel = Math.round((255 * mapData[country].masternodes) / highestMN); // equation
      mapData[country].fillKey = `heat${heatLevel}`;
    }
    // Get Pricing for Syscoin

    const {
      data:
        {
          market_data:
            {
              current_price:
                {
                  usd: sysUsd,
                  btc: sysBtc,
                  total_supply: totalSupply,
                },
              circulating_supply: circulatingSupply,
              market_cap: {
                usd: marketCap,
                btc: marketCapBtc,
              },
              total_volume: {
                usd: volume,
                btc: volumeBtc,
              },
              price_change_percentage_24h: priceChange,
            },
        },
    } = await axios
      .get('https://api.coingecko.com/api/v3/coins/syscoin?tickers=true&market_data=true')
      .catch((err) => {
        throw err;
      });

    // Get Blockchain Stats
    const {
      version,
      subversion: subVersion,
      protocolversion: protocol,
      connections: connect,
    } = await clientRPC.callRpc('getnetworkinfo')
      .call()
      .catch((err) => {
        throw err;
      });

    // Get Genesis Block
    const { time: genesisSeconds } = await clientRPC.callRpc('getblock', [hashGenesis])
      .call()
      .catch((err) => {
        throw err;
      });
    const date = moment(genesisSeconds * 1000).format('MMMM Do YYYY, h:mm:ss a');

    // Get Current Block
    const block = await clientRPC.callRpc('getblockcount').call().catch((err) => {
      throw err;
    });

    const getBlockHash = await clientRPC.callRpc('getblockhash', [block]).call().catch((err) => {
      throw err;
    });

    const getBlockData = await clientRPC.callRpc('getblock', [getBlockHash]).call().catch((err) => {
      throw err;
    });
    const nowTime = getBlockData.time;

    // Get 1440 Blocks Ago
    const oneDays = 43800;
    const blockOneDayAgo = block - oneDays;
    const getBlockHashDayAgo = await clientRPC.callRpc('getblockhash', [blockOneDayAgo]).call();
    const getBlockDataDayAgo = await clientRPC.callRpc('getblock', [getBlockHashDayAgo]).call();
    const oneDayAgoTime = getBlockDataDayAgo.time;

    // Calculate Time
    const diffTime = nowTime - oneDayAgoTime;
    const blockTimeSec = diffTime * 1000;
    const avgBlockTime = (blockTimeSec / 43800);

    // Get Governance Info
    const {
      lastsuperblock: lastSuperBlock,
      nextsuperblock: nextSuperBlock,
      proposalfee: proposalFee,
      nextsuperblock: sbNow,
    } = await clientRPC.callRpc('getgovernanceinfo').call().catch((err) => {
      throw err;
    });

    const budget = await clientRPC.callRpc('getsuperblockbudget', [nextSuperBlock])
      .call()
      .catch((err) => {
        throw err;
      });

    // Get Date of Next SuperBlock
    const diffBlock = nextSuperBlock - block;
    const workOutTime = (diffBlock * avgBlockTime);
    const currentDate = Date.now();
    const superBlockDate = currentDate + workOutTime;
    const superBlockNextDate = moment(superBlockDate).format('MMMM Do YYYY, h:mm:ss a');

    // Get Date of Voting Deadline
    const deadlineBlock = 4320;
    const votingDeadline = nextSuperBlock - deadlineBlock;
    const voteDeadTime = votingDeadline - block;
    const votingTime = voteDeadTime * avgBlockTime;
    const voteDate = currentDate + votingTime;
    const votingDeadlineDate = moment(voteDate).format('MMMM Do YYYY, h:mm:ss a');

    // Get Next 5 Superblocks
    const sbCounter = 43800;
    const sb1 = sbNow + sbCounter;
    const sb2 = sb1 + sbCounter;
    const sb3 = sb2 + sbCounter;
    const sb4 = sb3 + sbCounter;
    const sb5 = sb4 + sbCounter;

    // Get Next 5 Superblocks Date
    const sb1Diff = sb1 - block;
    const sb1DateWork = sb1Diff * avgBlockTime;
    const sb1Date = currentDate + sb1DateWork;
    const sb1EstDate = moment(sb1Date).format('MMMM Do YYYY');

    const sb2Diff = sb2 - block;
    const sb2DateWork = sb2Diff * avgBlockTime;
    const sb2Date = currentDate + sb2DateWork;
    const sb2EstDate = moment(sb2Date).format('MMMM Do YYYY');

    const sb3Diff = sb3 - block;
    const sb3DateWork = sb3Diff * avgBlockTime;
    const sb3Date = currentDate + sb3DateWork;
    const sb3EstDate = moment(sb3Date).format('MMMM Do YYYY');

    const sb4Diff = sb4 - block;
    const sb4DateWork = sb4Diff * avgBlockTime;
    const sb4Date = currentDate + sb4DateWork;
    const sb4EstDate = moment(sb4Date).format('MMMM Do YYYY');

    const sb5Diff = sb5 - block;
    const sb5DateWork = sb5Diff * avgBlockTime;
    const sb5Date = currentDate + sb5DateWork;
    const sb5EstDate = moment(sb5Date).format('MMMM Do YYYY');

    // Get Next 5 Superblocks Amounts
    const sb1Budget = await clientRPC.callRpc('getsuperblockbudget', [sb1]).call().catch((err) => {
      throw err;
    });
    const sb2Budget = await clientRPC.callRpc('getsuperblockbudget', [sb2]).call().catch((err) => {
      throw err;
    });
    const sb3Budget = await clientRPC.callRpc('getsuperblockbudget', [sb3]).call().catch((err) => {
      throw err;
    });
    const sb4Budget = await clientRPC.callRpc('getsuperblockbudget', [sb4]).call().catch((err) => {
      throw err;
    });
    const sb5Budget = await clientRPC.callRpc('getsuperblockbudget', [sb5]).call().catch((err) => {
      throw err;
    });

    const rewardElig = (mnInfo.enabled * 4) / 60;
    const avgPayoutFrequency = mnInfo.enabled / 60;
    const firstPay = rewardElig + avgPayoutFrequency;
    const reqCoin = 100000;
    const mnUsd = reqCoin * sysUsd;
    const mnBtc = reqCoin * sysBtc;
    const supply = circulatingSupply;
    const coinsLocked = mnInfo.totalMasternodes * 100000;
    const coinsLockedPercent = (mnInfo.totalMasternodes * 100000) / supply;
    const days = 3600000;

    // SB Stats
    const sbTotal = 43800;

    // Income stats starts
    const deflation = 0.95;
    const firstReward = 25.9875;
    const oneYearIncreaseSen = 1.35;
    const twoYearIncreaseSen = 2;
    const oneDay = 365;
    const oneWeek = 52;
    const oneMonth = 12;
    const rewardPerBlock = deflation * firstReward;
    const rewardPerBlockTwo = rewardPerBlock * deflation;
    const annualTotalRewards = rewardPerBlock * 60 * 24 * 365;
    const avgRewardYearly = annualTotalRewards / mnInfo.enabled;

    // One Year Seniority Calss
    const oneSenRewardPerBlock = rewardPerBlock * oneYearIncreaseSen;
    const oneSenAnnualTotalRewards = oneSenRewardPerBlock * 60 * 24 * 365;
    const oneAvgRewardYearlySen = oneSenAnnualTotalRewards / mnInfo.enabled;

    // Two Year Seniority Calcs
    const twoSenRewardPerBlock = rewardPerBlockTwo * twoYearIncreaseSen;
    const twoSenAnnualTotalRewards = twoSenRewardPerBlock * 60 * 24 * 365;
    const twoAvgRewardYearlySen = twoSenAnnualTotalRewards / mnInfo.enabled;

    // ROI Calcs
    const roi = avgRewardYearly / reqCoin;
    const roiDays = (100000 / avgRewardYearly) * 365;

    // Without Seniority
    // USD
    const usdDaily = (avgRewardYearly / oneDay) * sysUsd;
    const usdWeekly = (avgRewardYearly / oneWeek) * sysUsd;
    const usdMonthly = (avgRewardYearly / oneMonth) * sysUsd;
    const usdYearly = avgRewardYearly * sysUsd;

    // BTC
    const btcDaily = (avgRewardYearly / oneDay) * sysBtc;
    const btcWeekly = (avgRewardYearly / oneWeek) * sysBtc;
    const btcMonthly = (avgRewardYearly / oneMonth) * sysBtc;
    const btcYearly = avgRewardYearly * sysBtc;

    // SYS
    const sysDaily = avgRewardYearly / oneDay;
    const sysWeekly = avgRewardYearly / oneWeek;
    const sysMonthly = avgRewardYearly / oneMonth;
    const sysYearly = avgRewardYearly;

    // With One Seniority
    // USD
    const usdDailyOne = (oneAvgRewardYearlySen / oneDay) * sysUsd;
    const usdWeeklyOne = (oneAvgRewardYearlySen / oneWeek) * sysUsd;
    const usdMonthlyOne = (oneAvgRewardYearlySen / oneMonth) * sysUsd;
    const usdYearlyOne = oneAvgRewardYearlySen * sysUsd;

    // BTC
    const btcDailyOne = (oneAvgRewardYearlySen / oneDay) * sysBtc;
    const btcWeeklyOne = (oneAvgRewardYearlySen / oneWeek) * sysBtc;
    const btcMonthlyOne = (oneAvgRewardYearlySen / oneMonth) * sysBtc;
    const btcYearlyOne = (oneAvgRewardYearlySen * sysBtc);

    // SYS
    const sysDailyOne = (oneAvgRewardYearlySen / oneDay);
    const sysWeeklyOne = (oneAvgRewardYearlySen / oneWeek);
    const sysMonthlyOne = (oneAvgRewardYearlySen / oneMonth);
    const sysYearlyOne = oneAvgRewardYearlySen;

    // With Two Seniority
    // USD
    const usdDailyTwo = (twoAvgRewardYearlySen / oneDay) * sysUsd;
    const usdWeeklyTwo = (twoAvgRewardYearlySen / oneWeek) * sysUsd;
    const usdMonthlyTwo = (twoAvgRewardYearlySen / oneMonth) * sysUsd;
    const usdYearlyTwo = twoAvgRewardYearlySen * sysUsd;

    // BTC
    const btcDailyTwo = (twoAvgRewardYearlySen / oneDay) * sysBtc;
    const btcWeeklyTwo = (twoAvgRewardYearlySen / oneWeek) * sysBtc;
    const btcMonthlyTwo = (twoAvgRewardYearlySen / oneMonth) * sysBtc;
    const btcYearlyTwo = twoAvgRewardYearlySen * sysBtc;

    // SYS
    const sysDailyTwo = twoAvgRewardYearlySen / oneDay;
    const sysWeeklyTwo = twoAvgRewardYearlySen / oneWeek;
    const sysMonthlyTwo = twoAvgRewardYearlySen / oneMonth;
    const sysYearlyTwo = twoAvgRewardYearlySen;

    return res.status(200).json({
      stats: {
        mn_stats: {
          total: numeral(mnInfo.totalMasternodes).format('0,0'),
          enabled: numeral(mnInfo.enabled).format('0,0'),
          new_start_required: numeral(mnInfo.newStartRequired).format('0,0'),
          sentinel_ping_expired: numeral(mnInfo.sentinelPingExpired).format('0,0'),
          total_locked: numeral(coinsLocked).format('0,0.00'),
          coins_percent_locked: `${Number(coinsLockedPercent * 100).toFixed(2)}%`,
          current_supply: numeral(supply).format('0,0.00'),
          collateral_req: numeral(reqCoin).format('0,0'),
          masternode_price_usd: numeral(mnUsd).format('0,0.00'),
          masternode_price_btc: numeral(mnBtc).format('0,0.00000000'),
          roi: `${Number(roi * 100).toFixed(2)}%` + ` // ${Math.ceil(roiDays)} Days`,
          payout_frequency: ms(avgPayoutFrequency * days),
          first_pay: ms(firstPay * days),
          reward_eligble: ms(rewardElig * days),
        },

        price_stats: {
          price_usd: numeral(sysUsd).format('0,0.0000'),
          price_btc: numeral(sysBtc).format('0,0.00000000'),
          circulating_supply: numeral(circulatingSupply).format('0,0.00'),
          total_supply: numeral(totalSupply).format('0,0.00'),
          volume_usd: numeral(volume).format('0,0.00'),
          volume_btc: numeral(volumeBtc).format('0,0.00'),
          price_change: `${Number(priceChange).toFixed(4)}%`,
          market_cap_usd: numeral(marketCap).format('0,0.00'),
          market_cap_btc: numeral(marketCapBtc).format('0,0.00'),
        },

        blockchain_stats: {
          version,
          sub_version: subVersion,
          protocol,
          connections: connect,
          genesis: date,
          avg_block: ms(avgBlockTime),
        },

        superblock_stats: {
          last_superblock: lastSuperBlock,
          next_superblock: `SB${nextSuperBlock / sbTotal} - ${nextSuperBlock}`,
          proposal_fee: proposalFee,
          budget,
          superblock_date: superBlockNextDate,
          voting_deadline: votingDeadlineDate,
          sb1: `SB${sb1 / sbTotal} - ${sb1}`,
          sb2: `SB${sb2 / sbTotal} - ${sb2}`,
          sb3: `SB${sb3 / sbTotal} - ${sb3}`,
          sb4: `SB${sb4 / sbTotal} - ${sb4}`,
          sb5: `SB${sb5 / sbTotal} - ${sb5}`,
          sb1Budget,
          sb2Budget,
          sb3Budget,
          sb4Budget,
          sb5Budget,
          sb1Date: sb1EstDate,
          sb2Date: sb2EstDate,
          sb3Date: sb3EstDate,
          sb4Date: sb4EstDate,
          sb5Date: sb5EstDate,
        },

        income_stats: {
          usd: {
            daily: `$${Number(usdDaily).toFixed(2)}`,
            weekly: `$${Number(usdWeekly).toFixed(2)}`,
            monthly: `$${Number(usdMonthly).toFixed(2)}`,
            yearly: `$${Number(usdYearly).toFixed(2)}`,
          },
          btc: {
            daily: `${Number(btcDaily).toFixed(8)} BTC`,
            weekly: `${Number(btcWeekly).toFixed(8)} BTC`,
            monthly: `${Number(btcMonthly).toFixed(8)} BTC`,
            yearly: `${Number(btcYearly).toFixed(8)} BTC`,
          },
          sys: {
            daily: `${Number(sysDaily).toFixed(2)} SYS`,
            weekly: `${Number(sysWeekly).toFixed(2)} SYS`,
            monthly: `${Number(sysMonthly).toFixed(2)} SYS`,
            yearly: `${Number(sysYearly).toFixed(2)} SYS`,
          },
        },
        income_stats_seniority_one_year: {
          usd: {
            daily: `$${Number(usdDailyOne).toFixed(2)}`,
            weekly: `$${Number(usdWeeklyOne).toFixed(2)}`,
            monthly: `$${Number(usdMonthlyOne).toFixed(2)}`,
            yearly: `$${Number(usdYearlyOne).toFixed(2)}`,
          },
          btc: {
            daily: `${Number(btcDailyOne).toFixed(8)} BTC`,
            weekly: `${Number(btcWeeklyOne).toFixed(8)} BTC`,
            monthly: `${Number(btcMonthlyOne).toFixed(8)} BTC`,
            yearly: `${Number(btcYearlyOne).toFixed(8)} BTC`,
          },
          sys: {
            daily: `${Number(sysDailyOne).toFixed(2)} SYS`,
            weekly: `${Number(sysWeeklyOne).toFixed(2)} SYS`,
            monthly: `${Number(sysMonthlyOne).toFixed(2)} SYS`,
            yearly: `${Number(sysYearlyOne).toFixed(2)} SYS`,
          },
        },
        income_stats_seniority_two_year: {
          usd: {
            daily: `$${Number(usdDailyTwo).toFixed(2)}`,
            weekly: `$${Number(usdWeeklyTwo).toFixed(2)}`,
            monthly: `$${Number(usdMonthlyTwo).toFixed(2)}`,
            yearly: `$${Number(usdYearlyTwo).toFixed(2)}`,
          },
          btc: {
            daily: `${Number(btcDailyTwo).toFixed(8)} BTC`,
            weekly: `${Number(btcWeeklyTwo).toFixed(8)} BTC`,
            monthly: `${Number(btcMonthlyTwo).toFixed(8)} BTC`,
            yearly: `${Number(btcYearlyTwo).toFixed(8)} BTC`,
          },
          sys: {
            daily: `${Number(sysDailyTwo).toFixed(2)} SYS`,
            weekly: `${Number(sysWeeklyTwo).toFixed(2)} SYS`,
            monthly: `${Number(sysMonthlyTwo).toFixed(2)} SYS`,
            yearly: `${Number(sysYearlyTwo).toFixed(2)} SYS`,
          },
        },
      },
      mapData,
      mapFills,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  masterNodes,
  stats,
  countMasterNodes,
  list,
  info,
  getMiningInfo,
  getGovernanceInfo,
  getSuperBlockBudget,
};
