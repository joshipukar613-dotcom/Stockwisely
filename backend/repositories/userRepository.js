const { prisma } = require('../config/database');

const userRepository = {
  // Find user by email
  findByEmail: async (email) => {
    return await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
  },

  // Find user by ID
  findById: async (id) => {
    return await prisma.user.findUnique({
      where: { id }
    });
  },

  // Find user by Google ID
  findByGoogleId: async (googleId) => {
    return await prisma.user.findUnique({
      where: { googleId }
    });
  },

  // Create new user
  create: async (userData) => {
    return await prisma.user.create({
      data: {
        email: userData.email.toLowerCase(),
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        businessName: userData.businessName || null,
        businessType: userData.businessType || null,
        phoneNumber: userData.phoneNumber || null,
        isEmailVerified: false,
        role: userData.role || 'user',
        accountStatus: 'active',
        isActive: true,
      }
    });
  },

  // Create user from Google OAuth
  createFromGoogle: async (profile) => {
    return await prisma.user.create({
      data: {
        email: profile.email.toLowerCase(),
        firstName: profile.given_name || profile.displayName,
        lastName: profile.family_name || '',
        googleId: profile.id,
        avatar: profile.picture || null,
        isEmailVerified: true,
        role: 'user',
        accountStatus: 'active',
        isActive: true,
      }
    });
  },

  // Update user
  update: async (id, updateData) => {
    return await prisma.user.update({
      where: { id },
      data: updateData
    });
  },

  // Update last login
  updateLastLogin: async (id) => {
    return await prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() }
    });
  },

  // Verify email
  verifyEmail: async (id) => {
    return await prisma.user.update({
      where: { id },
      data: { isEmailVerified: true }
    });
  },

  // Update password
  updatePassword: async (id, hashedPassword) => {
    return await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });
  },

  // Get all users
  findAll: async () => {
    return await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
  },

  // Delete user
  delete: async (id) => {
    return await prisma.user.delete({
      where: { id }
    });
  },

  // Count total users
  count: async () => {
    return await prisma.user.count();
  }
};

module.exports = userRepository;