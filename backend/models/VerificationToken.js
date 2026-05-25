const mongoose = require('mongoose');
const crypto = require('crypto');

const verificationTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['email_verification', 'password_reset', 'two_factor'],
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  used: {
    type: Boolean,
    default: false,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
verificationTokenSchema.index({ userId: 1, type: 1, used: 1 });
verificationTokenSchema.index({ token: 1, type: 1 });

// Static method to generate secure token
verificationTokenSchema.statics.generateSecureToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

// Static method to generate 6-digit code
verificationTokenSchema.statics.generateSixDigitCode = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Static method to create email verification token
verificationTokenSchema.statics.createEmailVerificationToken = async function(userId, expiresInHours = 24) {
  const token = this.generateSixDigitCode();
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  
  return await this.create({
    userId,
    token,
    type: 'email_verification',
    expiresAt
  });
};

// Static method to create password reset token
verificationTokenSchema.statics.createPasswordResetToken = async function(userId, expiresInHours = 1) {
  const token = this.generateSecureToken();
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  
  return await this.create({
    userId,
    token,
    type: 'password_reset',
    expiresAt
  });
};

// Static method to create two-factor token
verificationTokenSchema.statics.createTwoFactorToken = async function(userId, expiresInMinutes = 10) {
  const token = this.generateSixDigitCode();
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  
  return await this.create({
    userId,
    token,
    type: 'two_factor',
    expiresAt
  });
};

// Method to validate token
verificationTokenSchema.methods.isValid = function() {
  return !this.used && this.expiresAt > new Date();
};

// Method to mark token as used
verificationTokenSchema.methods.markAsUsed = async function() {
  this.used = true;
  await this.save();
};

// Static method to validate and consume token
verificationTokenSchema.statics.validateAndConsumeToken = async function(token, type, userId) {
  const verificationToken = await this.findOne({
    token,
    type,
    userId,
    used: false,
    expiresAt: { $gt: new Date() }
  });
  
  if (!verificationToken) {
    return null;
  }
  
  await verificationToken.markAsUsed();
  return verificationToken;
};

// Static method to cleanup old tokens
verificationTokenSchema.statics.cleanupOldTokens = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  return result.deletedCount;
};

// Static method to get active tokens for user
verificationTokenSchema.statics.getActiveTokens = function(userId, type) {
  return this.find({
    userId,
    type,
    used: false,
    expiresAt: { $gt: new Date() }
  });
};

// Static method to revoke all tokens for user
verificationTokenSchema.statics.revokeAllTokens = async function(userId, type) {
  const result = await this.updateMany(
    { userId, type, used: false },
    { used: true }
  );
  return result.modifiedCount;
};

const VerificationToken = mongoose.model('VerificationToken', verificationTokenSchema);

module.exports = VerificationToken;