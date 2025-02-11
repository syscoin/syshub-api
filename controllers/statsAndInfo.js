const axios = require('axios')
const moment = require('moment')
const numeral = require('numeral')
const countries = require('i18n-iso-countries')
const geoip = require('geoip-country')

const ms = require('pretty-ms')
const { rgbToHex } = require('../utils/helpers')
// const { checkBodyEmpty } = require('../utils/helpers');
const { clientRPC, admin } = require('../utils/config')

/**
 * @function
 * @name masterNodes
 * @desc shows all masterNodes on the network.
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {string} req.query.page next page to perform the paging of the request.
 * @param {string} req.query.sortBy
 * @param {string} req.query.sortDesc
 * @param {string} req.query.perPage
 * @param {string} req.query.search search by ip of masterNodes
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 * @example
 *{"returnArr":[
 * {
 *    "proTxHash":"4ce437773cd142f32ac12dfb1fb4f80bbc89187f2f1e366af3329672aa74f98c",
 *    "address":"116.203.103.69:18369",
 *    "payee":"tsys1q7asylegmm0v4ntn5rq0xxmghe5vfpt4gytgegh",
 *    "status":"ENABLED",
 *    "collateralblock":6921,
 *    "lastpaidtime":"2 minutes ago",
 *    "lastpaidblock":554291,
 *    "owneraddress":"tsys1qhrhvf9846zwsucap2lyd6pgw3xp202uxtpa0nd",
 *    "votingaddress":"tsys1qkcleeuwex4nj2l55pe046csta87ufpdyz8fqe6",
 *    "collateraladdress":"TYJQbuKr3fgpNcJvvYBE9pEH4HBFykWi5Q",
 *    "pubkeyoperator":"8b439d03c7fcab34eac90d123ec6edc3a0fb47a41e48d6060abcee1fe64821b841fc831cee7a6615fc78c098036d080e",
 *    "lastpaidtimeS":1612184566
 * },
 * {
 *    "proTxHash":"5972e0ac81473330774d821fb11f7186b80cab2fea65212b766f17a93dff9553",
 *    "address":"161.97.143.68:18369",
 *    "payee":"tsys1qwftzzm5gtyvn5mlwkhnz84hhfleqwcgf4avmr2",
 *    "status":"ENABLED",
 *    "collateralblock":547399,
 *    "lastpaidtime":"3 minutes ago",
 *    "lastpaidblock":554290,
 *    "owneraddress":"tsys1qk9mh4rqhr3095nhpky2ua753d6as6e0lj7sah8",
 *    "votingaddress":"tsys1qdqz4hgx7cum6uu7nph8gn0fyt558tcml0fmphp",
 *    "collateraladdress":"tsys1qee57szc7fqkwk6ve3v8qg9nnk0zdey62s7ngpd",
 *    "pubkeyoperator":"968a6fac4c25ffbb0974dbfe1f83e23490d6fafb00036e75294396ad828c8bbafd6c4dae8c6506dde54ada4a24c63239",
 *    "lastpaidtimeS":1612184536
 * }],"mnNumb":6}
 */
// eslint-disable-next-line consistent-return
const masterNodes = async (req, res, next) => {
  try {
    const {
      page, sortBy, sortDesc, perPage,
    } = req.query
    let { search } = req.query
    if (typeof search !== 'undefined') {
      search.replace(/ /g, '')
    } else {
      search = ''
    }

    const masternodesArr = []
    let perPageDefault
    let newSearch = ''
    const filteredMN = []
    const vracajARR = []

    if (perPage > 90 || perPage < 1) {
      perPageDefault = 30
    } else {
      perPageDefault = perPage
    }

    if (search.includes(':')) {
      // eslint-disable-next-line prefer-destructuring
      newSearch = search.split(':')[0]
    } else {
      newSearch = search
    }
    const mns = await clientRPC
      .callRpc('masternode_list')
      .call()
      .catch((err) => {
        throw err
      })

    Object.keys(mns).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(mns, key)) {
        masternodesArr.push(mns[key])
      }
    })

    for (const masternode of masternodesArr) {
      // search filter
      if (
        masternode.address.split(':')[0].includes(newSearch)
        || masternode.payee.toUpperCase().includes(newSearch.toUpperCase())
      ) {
        const pushObj = { ...masternode }
        if (pushObj.lastpaidtime === 0) {
          pushObj.lastpaidtimeS = -Infinity
          pushObj.lastpaidtime = 'Never Paid'
        } else {
          pushObj.lastpaidtimeS = pushObj.lastpaidtime
          pushObj.lastpaidtime = moment.unix(pushObj.lastpaidtime).fromNow()
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
        filteredMN.push(pushObj)
      }
    }
    // if (sortBy === 'lastSeen') {
    //   filteredMN.sort((a, b) => a.lastseenS - b.lastseenS);
    // }
    // else if (sortBy === 'activeTime') {
    //   filteredMN.sort((a, b) => a.activesecondsS - b.activesecondsS);
    // }else
    if (sortBy === 'lastPayment') {
      filteredMN.sort((a, b) => a.lastpaidtimeS - b.lastpaidtimeS)
    } else {
      filteredMN.sort((a, b) => {
        if (a[sortBy] < b[sortBy]) return -1
        if (a[sortBy] > b[sortBy]) return 1
        return 0
      })
    }
    if (sortDesc) {
      filteredMN.reverse()
    }
    for (
      let i = perPageDefault * (page - 1);
      i < perPageDefault * page;
      i += 1
    ) {
      if (typeof filteredMN[i] !== 'undefined') {
        vracajARR.push(filteredMN[i])
      }
    }

    return res
      .status(200)
      .json({ returnArr: vracajARR, mnNumb: filteredMN.length })
  } catch (err) {
    next(err)
  }
}

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
        throw err
      })
    return res.status(200).json({ ok: true, nMasterNodes })
  } catch (err) {
    next(err)
  }
}

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
    const proposals = []
    const hiddenProposal = []
    const proposalResp = []

    const listProposalsHidden = await admin
      .firestore()
      .collection(process.env.COLLECTION_PROPOSAL_HIDDEN)
      .get()
      .catch((err) => {
        throw err
      })

    // eslint-disable-next-line no-underscore-dangle,array-callback-return
    listProposalsHidden._docs().map((doc) => {
      // eslint-disable-next-line no-underscore-dangle
      hiddenProposal.push(doc._fieldsProto.hash.stringValue)
    })

    const gObjectList = await clientRPC
      .callRpc('gobject_list')
      .call()
      .catch((err) => {
        throw err
      })

    // eslint-disable-next-line no-restricted-syntax
    for (const gObjectListKey in gObjectList) {
      // eslint-disable-next-line no-prototype-builtins
      if (gObjectList.hasOwnProperty(gObjectListKey)) {
        const key = gObjectList[gObjectListKey]
        const bb = !JSON.parse(key.DataString)[0]
          ? JSON.parse(key.DataString)
          : JSON.parse(key.DataString)[0][1]
        const { Hash } = key
        const ColHash = key.CollateralHash
        const { ObjectType } = key
        const { CreationTime } = key
        const { AbsoluteYesCount } = key
        const { YesCount } = key
        const { NoCount } = key
        const { AbstainCount } = key
        const { fBlockchainValidity } = key
        const { IsValidReason } = key
        const { fCachedValid } = key
        const { fCachedFunding } = key
        const { fCachedDelete } = key
        const { fCachedEndorsed } = key

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
        }

        proposals.push({ ...govList, ...bb })
        proposals.sort((a, b) => (a.AbsoluteYesCount < b.AbsoluteYesCount ? 1 : -1))
      }
    }
    // eslint-disable-next-line array-callback-return
    proposals.map((elem) => {
      const hidden = hiddenProposal.find((el) => el === elem.Hash)
      if (typeof hidden === 'undefined') {
        proposalResp.push(elem)
      }
    })

    return res.status(200).json(proposalResp)
  } catch (err) {
    next(err)
  }
}

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
 * @return {object} positive answer
 * @example
 * {
        "chain": "test",
        "blocks": 554302,
        "headers": 554302,
        "bestblockhash": "0000006f15dde5d7759b87dd285a69fb89ec7aca0f0edc12451b5ce6342c630f",
        "difficulty": 0.007504355927359071,
        "mediantime": 1612184911,
        "verificationprogress": 0.9999974977283622,
        "initialblockdownload": false,
        "chainwork": "0000000000000000000000000000000000000000000000000000052b0f1b470c",
        "size_on_disk": 266949376,
        "pruned": false,
        "geth_sync_status": "waiting to sync...",
        "geth_total_blocks": 0,
        "geth_current_block": 0,
        "softforks": {
            "bip34": {
                "type": "buried",
                "active": true,
                "height": 1
            },
            "bip66": {
                "type": "buried",
                "active": true,
                "height": 1
            },
            "bip65": {
                "type": "buried",
                "active": true,
                "height": 1
            },
            "csv": {
                "type": "buried",
                "active": true,
                "height": 1
            },
            "segwit": {
                "type": "buried",
                "active": true,
                "height": 0
            },
            "testdummy": {
                "type": "bip9",
                "bip9": {
                    "status": "active",
                    "start_time": 0,
                    "timeout": 999999999999,
                    "since": 550368
                },
                "height": 550368,
                "active": true
            },
            "taproot": {
                "type": "bip9",
                "bip9": {
                    "status": "active",
                    "start_time": -1,
                    "timeout": 9223372036854776000,
                    "since": 0
                },
                "height": 0,
                "active": true
            }
        },
        "warnings": ""
    }
 */

// eslint-disable-next-line consistent-return
const info = async (req, res, next) => {
  try {
    // eslint-disable-next-line no-shadow
    const info = await clientRPC
      .callRpc('getblockchaininfo')
      .call(true)
      .catch((err) => {
        throw err
      })

    return res.status(200).json({ ok: true, BlockChainInfo: info })
  } catch (err) {
    next(err)
  }
}

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
  "blocks": 554304,
  "difficulty": 0.007504355927359071,
  "networkhashps": 477857.0051890289,
  "pooledtx": 0,
  "chain": "test",
  "warnings": ""
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
        throw err
      })

    return res.status(200).json(getMiningInfo)
  } catch (err) {
    next(err)
  }
}

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
  "proposalfee": 150.00000000,
  "superblockcycle": 60,
  "lastsuperblock": 554280,
  "nextsuperblock": 554340
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
        throw err
      })
    return res.status(200).json(getGovernanceInfo)
  } catch (err) {
    next(err)
  }
}

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
        throw err
      })

    const { lastsuperblock, nextsuperblock } = getGovernanceInfo

    const getSuperBlockBudgetLast = await clientRPC
      .callRpc('getsuperblockbudget', [lastsuperblock])
      .call(true)
      .catch((err) => {
        throw err
      })

    const getSuperBlockBudgetNext = await clientRPC
      .callRpc('getsuperblockbudget', [nextsuperblock])
      .call(true)
      .catch((err) => {
        throw err
      })

    const lbs = { block: lastsuperblock, budget: getSuperBlockBudgetLast }
    const nbs = { block: nextsuperblock, budget: getSuperBlockBudgetNext }
    return res.status(200).json({ ok: true, lbs, nbs })
  } catch (err) {
    next(err)
  }
}

/**
 * @function
 * @name stats
 * @desc returns information for statistics including map information
 * @async
 * @method
 *
 * @param {object} req The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
 * @param {object} res The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {function} next errors caught and sent
 *
 * @return {object} positive answer
 * @example
 * "mn_stats": {
            "total": "6",
            "enabled": "6",
            "new_start_required": "0",
            "sentinel_ping_expired": "0",
            "total_locked": "600,000.00",
            "coins_percent_locked": "0.10%",
            "current_supply": "605,792,062.22",
            "collateral_req": "100,000",
            "masternode_price_usd": "10,373.40",
            "masternode_price_btc": "0.30800000",
            "roi": "2162.68% // 17 Days",
            "payout_frequency": "6m",
            "first_pay": "30m",
            "reward_eligble": "24m"
        },
 "price_stats": {
              "price_usd": "0.1037",
              "price_btc": "0.00000308",
              "circulating_supply": "605,792,062.22",
              "total_supply": "0.00",
              "volume_usd": "9,450,875.00",
              "volume_btc": "280.18",
              "price_change": "-1.5525%",
              "market_cap_usd": "62,707,009.00",
              "market_cap_btc": "1,860.00"
          },
 "blockchain_stats": {
              "version": 40200,
              "sub_version": "/Satoshi:4.2.0/",
              "protocol": 70016,
              "connections": 9,
              "genesis": "December 10th 2019, 1:46:40 pm",
              "avg_block": "1m 19.2s"
          },
 "superblock_stats": {
              "last_superblock": 554280,
              "next_superblock": "SB12.656164383561643 - 554340",
              "proposal_fee": 150,
              "budget": 219.45,
              "superblock_date": "February 1st 2021, 10:01:11 am",
              "voting_deadline": "January 28th 2021, 10:54:07 am",
              "sb1": "SB13.656164383561643 - 598140",
              "sb2": "SB14.656164383561643 - 641940",
              "sb3": "SB15.656164383561643 - 685740",
              "sb4": "SB16.656164383561645 - 729540",
              "sb5": "SB17.656164383561645 - 773340",
              "sb1Budget": 219.45,
              "sb2Budget": 219.45,
              "sb3Budget": 219.45,
              "sb4Budget": 219.45,
              "sb5Budget": 219.45,
              "sb1Date": "March 13th 2021",
              "sb2Date": "April 22nd 2021",
              "sb3Date": "June 1st 2021",
              "sb4Date": "July 12th 2021",
              "sb5Date": "August 21st 2021"
          },
 "income_stats": {
              "usd": {
                  "daily": "$614.64",
                  "weekly": "$4314.30",
                  "monthly": "$18695.29",
                  "yearly": "$224343.42"
              },
              "btc": {
                  "daily": "0.01824946 BTC",
                  "weekly": "0.12809719 BTC",
                  "monthly": "0.55508780 BTC",
                  "yearly": "6.66105363 BTC"
              },
              "sys": {
                  "daily": "5925.15 SYS",
                  "weekly": "41590.00 SYS",
                  "monthly": "180223.31 SYS",
                  "yearly": "2162679.75 SYS"
              }
          },
 "income_stats_seniority_one_year": {
              "usd": {
                  "daily": "$829.76",
                  "weekly": "$5824.30",
                  "monthly": "$25238.63",
                  "yearly": "$302863.62"
              },
              "btc": {
                  "daily": "0.02463677 BTC",
                  "weekly": "0.17293120 BTC",
                  "monthly": "0.74936853 BTC",
                  "yearly": "8.99242240 BTC"
              },
              "sys": {
                  "daily": "7998.95 SYS",
                  "weekly": "56146.49 SYS",
                  "monthly": "243301.47 SYS",
                  "yearly": "2919617.66 SYS"
              }
          },
 "income_stats_seniority_two_year": {
              "usd": {
                  "daily": "$1167.82",
                  "weekly": "$8197.16",
                  "monthly": "$35521.04",
                  "yearly": "$426252.50"
              },
              "btc": {
                  "daily": "0.03467398 BTC",
                  "weekly": "0.24338465 BTC",
                  "monthly": "1.05466682 BTC",
                  "yearly": "12.65600190 BTC"
              },
              "sys": {
                  "daily": "11257.78 SYS",
                  "weekly": "79020.99 SYS",
                  "monthly": "342424.29 SYS",
                  "yearly": "4109091.52 SYS"
              }
          }
 },
 "mapData": {
          "DEU": {
              "masternodes": 4,
              "fillKey": "heat255"
          },
          "FIN": {
              "masternodes": 1,
              "fillKey": "heat64"
          },
          "USA": {
              "masternodes": 1,
              "fillKey": "heat64"
          }
      },
 "mapFills": {
          "defaultFill": "#e8e8e8",
          "heat255": "#0000ff",
          "heat254": "#0001ff",
          "heat253": "#0002ff",
          "heat252": "#0003ff",
          "heat251": "#0004ff",
          "heat250": "#0005ff",
          "heat249": "#0006ff",
          "heat248": "#0007ff",
          "heat247": "#0008ff",
          "heat246": "#0009ff",
          "heat245": "#000aff",
          "heat244": "#000bff",
          "heat243": "#000cff",
          "heat242": "#000dff",
          "heat241": "#000eff",
          "heat240": "#000fff",
          "heat239": "#0010ff",
          "heat238": "#0011ff",
          "heat237": "#0012ff",
          "heat236": "#0013ff",
          "heat235": "#0014ff",
          "heat234": "#0015ff",
          "heat233": "#0016ff",
          "heat232": "#0017ff",
          "heat231": "#0018ff",
          "heat230": "#0019ff",
          "heat229": "#001aff",
          "heat228": "#001bff",
          "heat227": "#001cff",
          "heat226": "#001dff",
          "heat225": "#001eff",
          "heat224": "#001fff",
          "heat223": "#0020ff",
          "heat222": "#0021ff",
          "heat221": "#0022ff",
          "heat220": "#0023ff",
          "heat219": "#0024ff",
          "heat218": "#0025ff",
          "heat217": "#0026ff",
          "heat216": "#0027ff",
          "heat215": "#0028ff",
          "heat214": "#0029ff",
          "heat213": "#002aff",
          "heat212": "#002bff",
          "heat211": "#002cff",
          "heat210": "#002dff",
          "heat209": "#002eff",
          "heat208": "#002fff",
          "heat207": "#0030ff",
          "heat206": "#0031ff",
          "heat205": "#0032ff",
          "heat204": "#0033ff",
          "heat203": "#0034ff",
          "heat202": "#0035ff",
          "heat201": "#0036ff",
          "heat200": "#0037ff",
          "heat199": "#0038ff",
          "heat198": "#0039ff",
          "heat197": "#003aff",
          "heat196": "#003bff",
          "heat195": "#003cff",
          "heat194": "#003dff",
          "heat193": "#003eff",
          "heat192": "#003fff",
          "heat191": "#0040ff",
          "heat190": "#0041ff",
          "heat189": "#0042ff",
          "heat188": "#0043ff",
          "heat187": "#0044ff",
          "heat186": "#0045ff",
          "heat185": "#0046ff",
          "heat184": "#0047ff",
          "heat183": "#0048ff",
          "heat182": "#0049ff",
          "heat181": "#004aff",
          "heat180": "#004bff",
          "heat179": "#004cff",
          "heat178": "#004dff",
          "heat177": "#004eff",
          "heat176": "#004fff",
          "heat175": "#0050ff",
          "heat174": "#0051ff",
          "heat173": "#0052ff",
          "heat172": "#0053ff",
          "heat171": "#0054ff",
          "heat170": "#0055ff",
          "heat169": "#0056ff",
          "heat168": "#0057ff",
          "heat167": "#0058ff",
          "heat166": "#0059ff",
          "heat165": "#005aff",
          "heat164": "#005bff",
          "heat163": "#005cff",
          "heat162": "#005dff",
          "heat161": "#005eff",
          "heat160": "#005fff",
          "heat159": "#0060ff",
          "heat158": "#0061ff",
          "heat157": "#0062ff",
          "heat156": "#0063ff",
          "heat155": "#0064ff",
          "heat154": "#0065ff",
          "heat153": "#0066ff",
          "heat152": "#0067ff",
          "heat151": "#0068ff",
          "heat150": "#0069ff",
          "heat149": "#006aff",
          "heat148": "#006bff",
          "heat147": "#006cff",
          "heat146": "#006dff",
          "heat145": "#006eff",
          "heat144": "#006fff",
          "heat143": "#0070ff",
          "heat142": "#0071ff",
          "heat141": "#0072ff",
          "heat140": "#0073ff",
          "heat139": "#0074ff",
          "heat138": "#0075ff",
          "heat137": "#0076ff",
          "heat136": "#0077ff",
          "heat135": "#0078ff",
          "heat134": "#0079ff",
          "heat133": "#007aff",
          "heat132": "#007bff",
          "heat131": "#007cff",
          "heat130": "#007dff",
          "heat129": "#007eff",
          "heat128": "#007fff",
          "heat127": "#0080ff",
          "heat126": "#0081ff",
          "heat125": "#0082ff",
          "heat124": "#0083ff",
          "heat123": "#0084ff",
          "heat122": "#0085ff",
          "heat121": "#0086ff",
          "heat120": "#0087ff",
          "heat119": "#0088ff",
          "heat118": "#0089ff",
          "heat117": "#008aff",
          "heat116": "#008bff",
          "heat115": "#008cff",
          "heat114": "#008dff",
          "heat113": "#008eff",
          "heat112": "#008fff",
          "heat111": "#0090ff",
          "heat110": "#0091ff",
          "heat109": "#0092ff",
          "heat108": "#0093ff",
          "heat107": "#0094ff",
          "heat106": "#0095ff",
          "heat105": "#0096ff",
          "heat104": "#0097ff",
          "heat103": "#0098ff",
          "heat102": "#0099ff",
          "heat101": "#009aff",
          "heat100": "#009bff",
          "heat99": "#009cff",
          "heat98": "#009dff",
          "heat97": "#009eff",
          "heat96": "#009fff",
          "heat95": "#00a0ff",
          "heat94": "#00a1ff",
          "heat93": "#00a2ff",
          "heat92": "#00a3ff",
          "heat91": "#00a4ff",
          "heat90": "#00a5ff",
          "heat89": "#00a6ff",
          "heat88": "#00a7ff",
          "heat87": "#00a8ff",
          "heat86": "#00a9ff",
          "heat85": "#00aaff",
          "heat84": "#00abff",
          "heat83": "#00acff",
          "heat82": "#00adff",
          "heat81": "#00aeff",
          "heat80": "#00afff",
          "heat79": "#00b0ff",
          "heat78": "#00b1ff",
          "heat77": "#00b2ff",
          "heat76": "#00b3ff",
          "heat75": "#00b4ff",
          "heat74": "#00b5ff",
          "heat73": "#00b6ff",
          "heat72": "#00b7ff",
          "heat71": "#00b8ff",
          "heat70": "#00b9ff",
          "heat69": "#00baff",
          "heat68": "#00bbff",
          "heat67": "#00bcff",
          "heat66": "#00bdff",
          "heat65": "#00beff",
          "heat64": "#00bfff",
          "heat63": "#00c0ff",
          "heat62": "#00c1ff",
          "heat61": "#00c2ff",
          "heat60": "#00c3ff",
          "heat59": "#00c4ff",
          "heat58": "#00c5ff",
          "heat57": "#00c6ff",
          "heat56": "#00c7ff",
          "heat55": "#00c8ff",
          "heat54": "#00c9ff",
          "heat53": "#00caff",
          "heat52": "#00cbff",
          "heat51": "#00ccff",
          "heat50": "#00cdff",
          "heat49": "#00ceff",
          "heat48": "#00cfff",
          "heat47": "#00d0ff",
          "heat46": "#00d1ff",
          "heat45": "#00d2ff",
          "heat44": "#00d3ff",
          "heat43": "#00d4ff",
          "heat42": "#00d5ff",
          "heat41": "#00d6ff",
          "heat40": "#00d7ff",
          "heat39": "#00d8ff",
          "heat38": "#00d9ff",
          "heat37": "#00daff",
          "heat36": "#00dbff",
          "heat35": "#00dcff",
          "heat34": "#00ddff",
          "heat33": "#00deff",
          "heat32": "#00dfff",
          "heat31": "#00e0ff",
          "heat30": "#00e1ff",
          "heat29": "#00e2ff",
          "heat28": "#00e3ff",
          "heat27": "#00e4ff",
          "heat26": "#00e5ff",
          "heat25": "#00e6ff",
          "heat24": "#00e7ff",
          "heat23": "#00e8ff",
          "heat22": "#00e9ff",
          "heat21": "#00eaff",
          "heat20": "#00ebff",
          "heat19": "#00ecff",
          "heat18": "#00edff",
          "heat17": "#00eeff",
          "heat16": "#00efff",
          "heat15": "#00f0ff",
          "heat14": "#00f1ff",
          "heat13": "#00f2ff",
          "heat12": "#00f3ff",
          "heat11": "#00f4ff",
          "heat10": "#00f5ff",
          "heat9": "#00f6ff",
          "heat8": "#00f7ff",
          "heat7": "#00f8ff",
          "heat6": "#00f9ff",
          "heat5": "#00faff",
          "heat4": "#00fbff",
          "heat3": "#00fcff",
          "heat2": "#00fdff",
          "heat1": "#00feff",
          "heat0": "#00ffff"
      }
 */
// eslint-disable-next-line consistent-return
const stats = async (req, res, next) => {
  try {
    const hashGenesis = process.env.HASHGENESIS
    const mapData = {}
    let highestMN = 0
    const mapFills = { defaultFill: '#e8e8e8' }
    const mnInfo = {
      totalMasternodes: 0,
      enabled: 0,
      sentinelPingExpired: 0,
      newStartRequired: 0,
      expired: 0,
    }

    for (let i = 255; i >= 0; i -= 1) {
      mapFills[`heat${i}`] = rgbToHex(0, 255 - i, 255)
    }
    const mns = await clientRPC
      .callRpc('masternode_list')
      .call(true)
      .catch((err) => {
        throw err
      })

    mnInfo.totalMasternodes = Object.keys(mns).length
    Object.keys(mns).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(mns, key)) {
        if (mns[key].status === 'ENABLED') {
          mnInfo.enabled += 1
        } else if (mns[key].status === 'SENTINEL_PING_EXPIRED') {
          mnInfo.sentinelPingExpired += 1
        } else if (mns[key].status === 'NEW_START_REQUIRED') {
          mnInfo.newStartRequired += 1
        } else if (mns[key].status === 'EXPIRED') {
          mnInfo.expired += 1
        }
      }
      if (geoip.lookup(mns[key].address.split(':')[0]) != null) {
        const iso = geoip.lookup(mns[key].address.split(':')[0]).country
        const alpha3 = countries.alpha2ToAlpha3(iso)
        if (mapData[alpha3] === undefined) {
          mapData[alpha3] = {
            masternodes: 1,
          }
        } else {
          mapData[alpha3].masternodes += 1
        }
      }
    })

    for (const country in mapData) {
      if (mapData[country].masternodes > highestMN) {
        highestMN = mapData[country].masternodes
      }
    }
    for (const country in mapData) {
      const heatLevel = Math.round(
        (255 * mapData[country].masternodes) / highestMN,
      ) // equation
      mapData[country].fillKey = `heat${heatLevel}`
    }
    // Get Pricing for Syscoin

    const {
      data: {
        market_data: {
          current_price: {
            usd: sysUsd,
            btc: sysBtc,
            total_supply: totalSupply,
          },
          circulating_supply: circulatingSupply,
          market_cap: { usd: marketCap, btc: marketCapBtc },
          total_volume: { usd: volume, btc: volumeBtc },
          price_change_percentage_24h: priceChange,
        },
      },
    } = await axios
      .get(
        'https://api.coingecko.com/api/v3/coins/syscoin?tickers=true&market_data=true',
      )
      .catch((err) => {
        throw err
      })

    // Get Blockchain Stats
    const {
      version,
      subversion: subVersion,
      protocolversion: protocol,
      connections: connect,
    } = await clientRPC
      .callRpc('getnetworkinfo')
      .call()
      .catch((err) => {
        throw err
      })

    // Get Genesis Block
    const { time: genesisSeconds } = await clientRPC
      .callRpc('getblock', [hashGenesis])
      .call()
      .catch((err) => {
        throw err
      })
    const date = moment(genesisSeconds * 1000).format('MMMM Do YYYY, h:mm:ss a')

    // Get Current Block
    const block = await clientRPC
      .callRpc('getblockcount')
      .call()
      .catch((err) => {
        throw err
      })

    const getBlockHash = await clientRPC
      .callRpc('getblockhash', [block])
      .call()
      .catch((err) => {
        throw err
      })

    const getBlockData = await clientRPC
      .callRpc('getblock', [getBlockHash])
      .call()
      .catch((err) => {
        throw err
      })
    const nowTime = getBlockData.time

    // Get 1440 Blocks Ago
    const oneDays = 43800
    const blockOneDayAgo = block - oneDays
    const getBlockHashDayAgo = await clientRPC
      .callRpc('getblockhash', [blockOneDayAgo])
      .call()
    const getBlockDataDayAgo = await clientRPC
      .callRpc('getblock', [getBlockHashDayAgo])
      .call()
    const oneDayAgoTime = getBlockDataDayAgo.time

    // Calculate Time
    const diffTime = nowTime - oneDayAgoTime
    const blockTimeSec = diffTime * 1000
    const avgBlockTime = blockTimeSec / 43800

    // Get Governance Info
    const {
      lastsuperblock: lastSuperBlock,
      nextsuperblock: nextSuperBlock,
      proposalfee: proposalFee,
      nextsuperblock: sbNow,
    } = await clientRPC
      .callRpc('getgovernanceinfo')
      .call()
      .catch((err) => {
        throw err
      })

    const budget = await clientRPC
      .callRpc('getsuperblockbudget', [nextSuperBlock])
      .call()
      .catch((err) => {
        throw err
      })

    // Get Date of Next SuperBlock
    const diffBlock = nextSuperBlock - block
    const workOutTime = diffBlock * avgBlockTime
    const currentDate = Date.now()
    const superBlockDate = currentDate + workOutTime
    const superBlockNextDate = moment(superBlockDate).format(
      'MMMM Do YYYY, h:mm:ss a',
    )

    // Get Date of Voting Deadline
    const deadlineBlock = 4320
    const votingDeadline = nextSuperBlock - deadlineBlock
    const voteDeadTime = votingDeadline - block
    const votingTime = voteDeadTime * avgBlockTime
    const voteDate = currentDate + votingTime
    const votingDeadlineDate = moment(voteDate).format(
      'MMMM Do YYYY, h:mm:ss a',
    )

    // Get Next 5 Superblocks
    const sbCounter = 43800
    const sb1 = sbNow + sbCounter
    const sb2 = sb1 + sbCounter
    const sb3 = sb2 + sbCounter
    const sb4 = sb3 + sbCounter
    const sb5 = sb4 + sbCounter

    // Get Next 5 Superblocks Date
    const sb1Diff = sb1 - block
    const sb1DateWork = sb1Diff * avgBlockTime
    const sb1Date = currentDate + sb1DateWork
    const sb1EstDate = moment(sb1Date).format('MMMM Do YYYY')

    const sb2Diff = sb2 - block
    const sb2DateWork = sb2Diff * avgBlockTime
    const sb2Date = currentDate + sb2DateWork
    const sb2EstDate = moment(sb2Date).format('MMMM Do YYYY')

    const sb3Diff = sb3 - block
    const sb3DateWork = sb3Diff * avgBlockTime
    const sb3Date = currentDate + sb3DateWork
    const sb3EstDate = moment(sb3Date).format('MMMM Do YYYY')

    const sb4Diff = sb4 - block
    const sb4DateWork = sb4Diff * avgBlockTime
    const sb4Date = currentDate + sb4DateWork
    const sb4EstDate = moment(sb4Date).format('MMMM Do YYYY')

    const sb5Diff = sb5 - block
    const sb5DateWork = sb5Diff * avgBlockTime
    const sb5Date = currentDate + sb5DateWork
    const sb5EstDate = moment(sb5Date).format('MMMM Do YYYY')

    // Get Next 5 Superblocks Amounts
    const sb1Budget = await clientRPC
      .callRpc('getsuperblockbudget', [sb1])
      .call()
      .catch((err) => {
        throw err
      })
    const sb2Budget = await clientRPC
      .callRpc('getsuperblockbudget', [sb2])
      .call()
      .catch((err) => {
        throw err
      })
    const sb3Budget = await clientRPC
      .callRpc('getsuperblockbudget', [sb3])
      .call()
      .catch((err) => {
        throw err
      })
    const sb4Budget = await clientRPC
      .callRpc('getsuperblockbudget', [sb4])
      .call()
      .catch((err) => {
        throw err
      })
    const sb5Budget = await clientRPC
      .callRpc('getsuperblockbudget', [sb5])
      .call()
      .catch((err) => {
        throw err
      })

    const rewardElig = (mnInfo.enabled * 4) / 60
    const avgPayoutFrequency = mnInfo.enabled / 60
    const firstPay = rewardElig + avgPayoutFrequency
    const reqCoin = 100000
    const mnUsd = reqCoin * sysUsd
    const mnBtc = reqCoin * sysBtc
    const supply = circulatingSupply
    const coinsLocked = mnInfo.totalMasternodes * 100000
    const coinsLockedPercent = (mnInfo.totalMasternodes * 100000) / supply
    const days = 3600000

    // SB Stats
    const sbTotal = 43800

    // Income stats starts
    const deflation = 0.95
    const firstReward = 25.9875
    const oneYearIncreaseSen = 1.35
    const twoYearIncreaseSen = 2
    const oneDay = 365
    const oneWeek = 52
    const oneMonth = 12
    const rewardPerBlock = deflation * firstReward
    const rewardPerBlockTwo = rewardPerBlock * deflation
    const annualTotalRewards = rewardPerBlock * 60 * 24 * 365

    const avgRewardYearly = annualTotalRewards / mnInfo.enabled

    // One Year Seniority Calss
    const oneSenRewardPerBlock = rewardPerBlock * oneYearIncreaseSen
    const oneSenAnnualTotalRewards = oneSenRewardPerBlock * 60 * 24 * 365
    const oneAvgRewardYearlySen = oneSenAnnualTotalRewards / mnInfo.enabled

    // Two Year Seniority Calcs
    const twoSenRewardPerBlock = rewardPerBlockTwo * twoYearIncreaseSen
    const twoSenAnnualTotalRewards = twoSenRewardPerBlock * 60 * 24 * 365
    const twoAvgRewardYearlySen = twoSenAnnualTotalRewards / mnInfo.enabled

    // ROI Calcs
    const roi = Number.isFinite(avgRewardYearly) ? avgRewardYearly : 0 / reqCoin
    const roiDays = (100000 / avgRewardYearly) * 365

    // Without Seniority
    // USD
    const usdDaily = (Number.isFinite(avgRewardYearly) ? avgRewardYearly : 0 / oneDay) * sysUsd
    const usdWeekly = (Number.isFinite(avgRewardYearly) ? avgRewardYearly : 0 / oneWeek)
      * sysUsd
    const usdMonthly = (Number.isFinite(avgRewardYearly) ? avgRewardYearly : 0 / oneMonth)
      * sysUsd
    const usdYearly = (Number.isFinite(avgRewardYearly) ? avgRewardYearly : 0) * sysUsd

    // BTC
    const btcDaily = (Number.isFinite(avgRewardYearly) ? avgRewardYearly : 0 / oneDay) * sysBtc
    const btcWeekly = (Number.isFinite(avgRewardYearly) ? avgRewardYearly : 0 / oneWeek)
      * sysBtc
    const btcMonthly = (Number.isFinite(avgRewardYearly) ? avgRewardYearly : 0 / oneMonth)
      * sysBtc
    const btcYearly = (Number.isFinite(avgRewardYearly) ? avgRewardYearly : 0) * sysBtc

    // SYS
    const sysDaily = Number.isFinite(avgRewardYearly)
      ? avgRewardYearly
      : 0 / oneDay
    const sysWeekly = Number.isFinite(avgRewardYearly)
      ? avgRewardYearly
      : 0 / oneWeek
    const sysMonthly = Number.isFinite(avgRewardYearly)
      ? avgRewardYearly
      : 0 / oneMonth
    const sysYearly = Number.isFinite(avgRewardYearly) ? avgRewardYearly : 0

    // With One Seniority
    // USD
    const usdDailyOne = (Number.isFinite(oneAvgRewardYearlySen)
      ? oneAvgRewardYearlySen
      : 0 / oneDay) * sysUsd
    const usdWeeklyOne = (Number.isFinite(oneAvgRewardYearlySen)
      ? oneAvgRewardYearlySen
      : 0 / oneWeek) * sysUsd
    const usdMonthlyOne = (Number.isFinite(oneAvgRewardYearlySen)
      ? oneAvgRewardYearlySen
      : 0 / oneMonth) * sysUsd
    const usdYearlyOne = Number.isFinite(oneAvgRewardYearlySen)
      ? oneAvgRewardYearlySen
      : 0 * sysUsd

    // BTC
    const btcDailyOne = (Number.isFinite(oneAvgRewardYearlySen)
      ? oneAvgRewardYearlySen
      : 0 / oneDay) * sysBtc
    const btcWeeklyOne = (Number.isFinite(oneAvgRewardYearlySen)
      ? oneAvgRewardYearlySen
      : 0 / oneWeek) * sysBtc
    const btcMonthlyOne = (Number.isFinite(oneAvgRewardYearlySen)
      ? oneAvgRewardYearlySen
      : 0 / oneMonth) * sysBtc
    const btcYearlyOne = Number.isFinite(oneAvgRewardYearlySen)
      ? oneAvgRewardYearlySen
      : 0 * sysBtc

    // SYS
    const sysDailyOne = Number.isFinite(oneAvgRewardYearlySen)
      ? oneAvgRewardYearlySen
      : 0 / oneDay
    const sysWeeklyOne = Number.isFinite(oneAvgRewardYearlySen)
      ? oneAvgRewardYearlySen
      : 0 / oneWeek
    const sysMonthlyOne = Number.isFinite(oneAvgRewardYearlySen)
      ? oneAvgRewardYearlySen
      : 0 / oneMonth
    const sysYearlyOne = Number.isFinite(oneAvgRewardYearlySen)
      ? oneAvgRewardYearlySen
      : 0

    // With Two Seniority
    // USD
    const usdDailyTwo = (Number.isFinite(twoAvgRewardYearlySen)
      ? twoAvgRewardYearlySen
      : 0 / oneDay) * sysUsd
    const usdWeeklyTwo = (Number.isFinite(twoAvgRewardYearlySen)
      ? twoAvgRewardYearlySen
      : 0 / oneWeek) * sysUsd
    const usdMonthlyTwo = (Number.isFinite(twoAvgRewardYearlySen)
      ? twoAvgRewardYearlySen
      : 0 / oneMonth) * sysUsd
    const usdYearlyTwo = Number.isFinite(twoAvgRewardYearlySen)
      ? twoAvgRewardYearlySen
      : 0 * sysUsd

    // BTC
    const btcDailyTwo = (Number.isFinite(twoAvgRewardYearlySen)
      ? twoAvgRewardYearlySen
      : 0 / oneDay) * sysBtc
    const btcWeeklyTwo = (Number.isFinite(twoAvgRewardYearlySen)
      ? twoAvgRewardYearlySen
      : 0 / oneWeek) * sysBtc
    const btcMonthlyTwo = (Number.isFinite(twoAvgRewardYearlySen)
      ? twoAvgRewardYearlySen
      : 0 / oneMonth) * sysBtc
    const btcYearlyTwo = Number.isFinite(twoAvgRewardYearlySen)
      ? twoAvgRewardYearlySen
      : 0 * sysBtc

    // SYS
    const sysDailyTwo = Number.isFinite(twoAvgRewardYearlySen)
      ? twoAvgRewardYearlySen
      : 0 / oneDay
    const sysWeeklyTwo = Number.isFinite(twoAvgRewardYearlySen)
      ? twoAvgRewardYearlySen
      : 0 / oneWeek
    const sysMonthlyTwo = Number.isFinite(twoAvgRewardYearlySen)
      ? twoAvgRewardYearlySen
      : 0 / oneMonth
    const sysYearlyTwo = Number.isFinite(twoAvgRewardYearlySen)
      ? twoAvgRewardYearlySen
      : 0

    return res.status(200).json({
      stats: {
        mn_stats: {
          total: numeral(mnInfo.totalMasternodes).format('0,0'),
          enabled: numeral(mnInfo.enabled).format('0,0'),
          new_start_required: numeral(mnInfo.newStartRequired).format('0,0'),
          sentinel_ping_expired: numeral(mnInfo.sentinelPingExpired).format(
            '0,0',
          ),
          total_locked: numeral(coinsLocked).format('0,0.00'),
          coins_percent_locked: `${Number(coinsLockedPercent * 100).toFixed(2)}%`,
          current_supply: numeral(supply).format('0,0.00'),
          collateral_req: numeral(reqCoin).format('0,0'),
          masternode_price_usd: numeral(mnUsd).format('0,0.00'),
          masternode_price_btc: numeral(mnBtc).format('0,0.00000000'),
          roi:
            `${Number(roi * 100).toFixed(2)}%`
            + ` // ${Math.ceil(roiDays)} Days`,
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
          next_superblock: `SB${Math.floor(nextSuperBlock / sbTotal)} - ${nextSuperBlock}`,
          proposal_fee: proposalFee,
          budget,
          superblock_date: superBlockNextDate,
          voting_deadline: votingDeadlineDate,
          sb1: `SB${Math.floor(sb1 / sbTotal)} - ${sb1}`,
          sb2: `SB${Math.floor(sb2 / sbTotal)} - ${sb2}`,
          sb3: `SB${Math.floor(sb3 / sbTotal)} - ${sb3}`,
          sb4: `SB${Math.floor(sb4 / sbTotal)} - ${sb4}`,
          sb5: `SB${Math.floor(sb5 / sbTotal)} - ${sb5}`,
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
    })
  } catch (err) {
    next(err)
  }
}

/**
 * @function
 * @name usersApp
 * @desc returns information for the number of users of the application
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
    "ok": true,
    "users": 4
}
 */
// eslint-disable-next-line consistent-return
const usersApp = async (req, res, next) => {
  try {
    const users = await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_INFO)
      .get()
      .catch((err) => {
        throw err
      })

    // eslint-disable-next-line no-underscore-dangle
    return res
      .status(200)
      .json({
        ok: true,
        users: Number(users._docs()[0]._fieldsProto.nUsers.integerValue),
      })
  } catch (err) {
    next(err)
  }
}
module.exports = {
  masterNodes,
  stats,
  countMasterNodes,
  list,
  info,
  getMiningInfo,
  getGovernanceInfo,
  getSuperBlockBudget,
  usersApp,
}
