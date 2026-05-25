const { prisma } = require('../config/database');
const crypto = require('crypto');

const tokenRepository = {
  // Create email verification token
  createEmailVerificationToken: async (userId) => {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return await prisma.verificationToken.create({
      data: {
        userId,
        token,
        type: 'email_verification',
        expiresAt,
        used: false,
      }
    });
  },

  // Create password reset token
  createPasswordResetToken: async (userId) => {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    return await prisma.verificationToken.create({
      data: {
        userId,
        token,
        type: 'password_reset',
        expiresAt,
        used: false,
      }
    });
  },

  // Find valid token
  findValidToken: async (token, type) => {
    return await prisma.verificationToken.findFirst({
      where: {
        token,
        type,
        used: false,
        expiresAt: {
          gt: new Date() // Greater than now (not expired)
        }
      },
      include: {
        user: true
      }
    });
  },

  // Mark token as used
  markAsUsed: async (id) => {
    return await prisma.verificationToken.update({
      where: { id },
      data: { used: true }
    });
  },

  // Update token (for custom codes)
  updateToken: async (id, data) => {
    return await prisma.verificationToken.update({
      where: { id },
      data
    });
  },

  // Delete expired tokens (cleanup)
  deleteExpired: async () => {
    return await prisma.verificationToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
  },

  // Delete user tokens
  deleteUserTokens: async (userId, type = null) => {
    const where = { userId };
    if (type) where.type = type;

    return await prisma.verificationToken.deleteMany({ where });
  },
};

module.exports = tokenRepository;