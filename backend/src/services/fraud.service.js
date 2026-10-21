import { FraudProfile } from '../models/FraudProfile.js';
import { decryptSecret } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

async function getExternalRiskScore(phone, fraudSettings) {
  // Internal scoring keeps running in the demo; the paid third-party lookup does not.
  if (env.isDemo || !fraudSettings?.thirdPartyEnabled || !fraudSettings?.thirdPartyProvider) return null;

  try {
    // Inside the try: a key that no longer decrypts (changed APP_ENCRYPTION_KEY) must not fail the order.
    const apiKey = decryptSecret(fraudSettings.thirdPartyApiKey);
    if (!apiKey) return null;

    const res = await fetch(fraudSettings.thirdPartyProvider, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ phone }),
      // A slow third party must not hold up checkout.
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Expected shape: { riskScore: 0-100 }. Any other shape/provider is ignored for now.
    return typeof data?.riskScore === 'number' ? data.riskScore : null;
  } catch (err) {
    logger.warn('Fraud: 3rd-party provider check failed, skipping:', err.message);
    return null;
  }
}

function computeInternalScore(profile, orderValue) {
  const reasons = [];
  let score = 0;

  const total = profile.totalOrders;
  if (total > 0) {
    const cancelRatio = profile.cancelledOrders / total;
    const returnRatio = profile.returnedOrders / total;
    const unconfirmedRatio = profile.unconfirmedCodOrders / total;

    if (cancelRatio > 0.3) {
      score += 30;
      reasons.push('High cancellation rate on past orders');
    }
    if (returnRatio > 0.3) {
      score += 25;
      reasons.push('High return rate on past orders');
    }
    if (unconfirmedRatio > 0.3) {
      score += 25;
      reasons.push('History of unconfirmed COD orders');
    }
  } else if (orderValue > 10000) {
    score += 15;
    reasons.push('First order from this phone number, high order value');
  }

  if (profile.flaggedManually) {
    score += 40;
    reasons.push('Manually flagged by an admin');
  }

  return { score: Math.min(score, 100), reasons };
}

function levelFromScore(score) {
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

/**
 * The phone's profile, created on its first order. Two orders from a new phone can arrive at the same
 * moment (a double-clicked button), and both must succeed — the unique index decides who creates it.
 */
async function getOrCreateProfile(phone) {
  try {
    return await FraudProfile.findOneAndUpdate({ phone }, { $setOnInsert: { phone } }, { upsert: true, new: true });
  } catch (err) {
    if (err.code === 11000) return FraudProfile.findOne({ phone });
    throw err;
  }
}

/** Scores a new order for fraud risk and returns the profile + score, ready to store on the order. */
export async function scoreOrder({ phone, orderValue }, settings) {
  const profile = await getOrCreateProfile(phone);

  const { score: internalScore, reasons } = computeInternalScore(profile, orderValue);
  const externalScore = await getExternalRiskScore(phone, settings?.fraud);

  const internalWeight = settings?.fraud?.internalWeight ?? 1;
  const externalWeight = settings?.fraud?.externalWeight ?? 0;
  const finalScore =
    externalScore != null
      ? internalWeight * internalScore + externalWeight * externalScore
      : internalScore;

  const level = levelFromScore(finalScore);

  // One atomic update: orders arriving together from the same phone must each be counted.
  await FraudProfile.updateOne(
    { _id: profile._id },
    {
      $inc: { totalOrders: 1 },
      $set: {
        internalRiskScore: internalScore,
        externalRiskScore: externalScore,
        finalRiskScore: finalScore,
        riskLevel: level,
        ...(externalScore != null ? { externalCheckedAt: new Date() } : {}),
      },
    }
  );

  return { internalScore, externalScore, finalScore, level, reasons };
}

/** Keeps the phone's FraudProfile counters in sync as an order's lifecycle progresses. */
export async function recordOrderOutcome(phone, { from, to, paymentMethod }) {
  const inc = {};
  if (to === 'delivered') inc.deliveredOrders = 1;
  if (to === 'cancelled') inc.cancelledOrders = 1;
  if (to === 'returned') inc.returnedOrders = 1;
  if (to === 'cancelled' && from === 'pending' && paymentMethod === 'cod') {
    inc.unconfirmedCodOrders = 1;
  }

  if (Object.keys(inc).length === 0) return;
  await FraudProfile.updateOne({ phone }, { $inc: inc });
}
