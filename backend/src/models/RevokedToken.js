import mongoose from 'mongoose';

/**
 * A login token that was signed out of before it expired. Login tokens are stateless JWTs, so without this list a copied
 * cookie would keep working for its whole life after the owner logged out. Entries remove themselves once the token would
 * have expired anyway.
 */
const revokedTokenSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});

revokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RevokedToken = mongoose.model('RevokedToken', revokedTokenSchema);
