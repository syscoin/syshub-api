const { validateIp } = require('../utils/helpers');

const prepareMn = (req, res, next) => {
  try {
    const {
      collateralHash,
      collateralIndex,
      ipAddress,
      ownerKeyAddr,
      operatorPubKey,
      votingKeyAddr,
      operatorReward,
      payoutAddress,
      feeSourceAddress,
    } = req.body;

    if ((collateralHash === undefined || collateralHash.length === 0)
      || (collateralIndex === undefined || collateralIndex.length === 0)
      || (ipAddress === undefined || ipAddress.length === 0)
      || (ownerKeyAddr === undefined || ownerKeyAddr.length === 0)
      || (operatorPubKey === undefined || operatorPubKey.length === 0)
      || (votingKeyAddr === undefined || votingKeyAddr.length === 0)
      || (operatorReward === undefined || operatorReward.length === 0)
      || (payoutAddress === undefined || payoutAddress.length === 0)) {
      return res.status(400).json({ ok: false, message: 'required fields' });
    }

    if ((typeof collateralIndex !== 'number' && !Number.isFinite(collateralIndex))
      || (typeof operatorReward !== 'number' && !Number.isFinite(operatorReward))) {
      return res.status(406).json({ ok: false, message: 'invalid collateral Index or operator reward' });
    }

    if (!validateIp(ipAddress)) {
      return res.status(406).json({ ok: false, message: 'invalid ip' });
    }

    const command = `protx_register_prepare ${collateralHash} ${collateralIndex} ${ipAddress}:${process.env.NODE_ENV === 'dev'?'18369':'8369'} ${ownerKeyAddr} ${operatorPubKey} ${votingKeyAddr} ${votingKeyAddr} ${operatorReward} ${payoutAddress} ${feeSourceAddress || ''}`.trim();

    return res.status(200).json({ ok: true, command });
  } catch (err) {
    next(err);
  }
};

const signmessage = (req, res, next) => {
  try {
    const { collateralAddress, signMessage } = req.body;
    let command;
    if ((collateralAddress === undefined || collateralAddress.length === 0)
      || (signMessage === undefined || signMessage.length === 0)) {
      return res.status(400).json({ ok: false, message: 'required fields' });
    }
    if (collateralAddress.startsWith('sys') || collateralAddress.startsWith('tsys')) {
      command = `signmessagebech32 ${collateralAddress} ${signMessage}`.trim();
    } else {
      command = `signmessage ${collateralAddress} ${signMessage}`.trim();
    }
    return res.status(200).json({ ok: true, command });
  } catch (err) {
    next(err);
  }
};
const submitMn = (req, res, next) => {
  try {
    const { tx, sig } = req.body;
    if ((tx === undefined || tx.length === 0) || (sig === undefined || sig.length === 0)) {
      return res.status(400).json({ ok: false, message: 'required fields' });
    }
    const command = `protx_register_submit ${tx} ${sig}`.trim();
    return res.status(200).json({ ok: true, command });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  prepareMn,
  signmessage,
  submitMn,
};
