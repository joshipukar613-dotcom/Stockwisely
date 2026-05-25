const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const userRepository = require('../repositories/userRepository');
const tokenRepository = require('../repositories/tokenRepository');
const { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } = require('../services/emailService');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Generate verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register new user
const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      businessName,
      phoneNumber,
      businessType
    } = req.body;

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email address'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Check if it's the first user
    const userCount = await userRepository.count();
    const role = userCount === 0 ? 'ADMIN' : 'SALES_CLERK';

    // Create new user
    const user = await userRepository.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      businessName,
      phoneNumber,
      businessType,
      role
    });

    // If it's the first user, we don't need them to change password immediately
    if (role === 'ADMIN') {
      await userRepository.update(user.id, { mustChangePassword: false });
    }

    // Generate verification token
    const verificationCode = generateVerificationCode();
    const verificationToken = await tokenRepository.createEmailVerificationToken(user.id);
    
    // Update token with custom code
    await tokenRepository.updateToken(verificationToken.id, { token: verificationCode });

    // Send verification email
    await sendVerificationEmail(user.email, verificationCode, user.firstName);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification code.',
      data: {
        userId: user.id,
        email: user.email,
        requiresVerification: true
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Verify email with code
const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    // Find user
    const user = await userRepository.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find verification token
    const verificationToken = await tokenRepository.findValidToken(code, 'email_verification');

    if (!verificationToken || verificationToken.userId !== user.id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Mark token as used
    await tokenRepository.markAsUsed(verificationToken.id);

    // Update user
    await userRepository.verifyEmail(user.id);
    await userRepository.update(user.id, { accountStatus: 'active' });

    // Get updated user
    const updatedUser = await userRepository.findById(user.id);

    // Send welcome email
    await sendWelcomeEmail(updatedUser.email, updatedUser.firstName);

    // Generate JWT token
    const token = generateToken(updatedUser.id);

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        token,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          businessName: updatedUser.businessName,
          role: updatedUser.role,
          isEmailVerified: updatedUser.isEmailVerified
        }
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Resend verification email
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await userRepository.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Deactivate existing tokens
    await tokenRepository.deleteUserTokens(user.id, 'email_verification');

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const verificationToken = await tokenRepository.createEmailVerificationToken(user.id);
    
    // Update token with custom code
    await tokenRepository.updateToken(verificationToken.id, { token: verificationCode });

    // Send verification email
    await sendVerificationEmail(user.email, verificationCode, user.firstName);

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { identifier, email, username, password } = req.body;

    const loginId = (identifier || email || username || '').trim();
    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username or email and password are required'
      });
    }

    // Decide which table to query based on presence of '@'
    const useEmail = loginId.includes('@');
    let dbUser = null;
    let source = null;

    if (useEmail) {
      // Query Prisma-managed "User" table directly via SQL
      const { rows } = await pool.query(
        'SELECT id, email, password, role, "firstName", "lastName", "businessName", "accountStatus", "isEmailVerified", "mustChangePassword", "isActive" FROM "User" WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [loginId]
      );
      dbUser = rows[0] || null;
      source = 'User';
    } else {
      const { rows } = await pool.query(
        'SELECT id, username, password_hash AS password, role FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1',
        [loginId]
      );
      dbUser = rows[0] || null;
      source = 'users';
    }

    if (!dbUser || !dbUser.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const valid = await bcrypt.compare(password, dbUser.password);
    if (!valid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (dbUser.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    const token = generateToken(dbUser.id);

    // Basic user info for client
    const userInfo = {
      id: dbUser.id,
      role: dbUser.role || 'SALES_CLERK',
      ...(dbUser.email ? { email: dbUser.email } : {}),
      ...(dbUser.username ? { username: dbUser.username } : {}),
      ...(dbUser.firstName ? { firstName: dbUser.firstName } : {}),
      ...(dbUser.lastName ? { lastName: dbUser.lastName } : {}),
      ...(dbUser.businessName ? { businessName: dbUser.businessName } : {}),
      ...(typeof dbUser.isEmailVerified !== 'undefined' ? { isEmailVerified: dbUser.isEmailVerified } : {}),
      ...(dbUser.accountStatus ? { accountStatus: dbUser.accountStatus } : {}),
      forcePasswordChange: dbUser.mustChangePassword || false
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: userInfo
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Request password reset
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await userRepository.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Update user with reset token
    await userRepository.update(user.id, {
      resetToken: hashedToken,
      resetTokenExpires: resetTokenExpires
    });

    // Send password reset email
    await sendPasswordResetEmail(user.email, resetToken, user.firstName);

    res.json({
      success: true,
      message: 'Password reset email sent successfully'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send password reset email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Hash the token from URL
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user by token and check expiry
    const { rows } = await pool.query(
      'SELECT id FROM "User" WHERE "resetToken" = $1 AND "resetTokenExpires" > NOW() LIMIT 1',
      [hashedToken]
    );
    const user = rows[0];

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password and clear token
    await userRepository.update(user.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpires: null,
      mustChangePassword: false
    });

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed'
    });
  }
};

// Change password (authenticated users)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Find user
    const user = await userRepository.findById(userId);
    if (!user || !user.password) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await userRepository.update(userId, {
      password: hashedPassword,
      mustChangePassword: false
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

// Force change password (for new users or reset)
const forceChangePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user.id;
    console.log('Force changing password for user:', userId);
    
    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear flag
    await userRepository.update(userId, {
      password: hashedPassword,
      mustChangePassword: false
    });

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Force change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update password'
    });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const user = await userRepository.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          businessName: user.businessName,
          phoneNumber: user.phoneNumber,
          businessType: user.businessType,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          accountStatus: user.accountStatus,
          avatar: user.avatar,
          preferences: user.preferences,
          forcePasswordChange: user.mustChangePassword || false,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, businessName, phoneNumber, preferences } = req.body;

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (businessName) updateData.businessName = businessName;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (preferences) updateData.preferences = preferences;

    const updatedUser = await userRepository.update(userId, updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser.id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          businessName: updatedUser.businessName,
          phoneNumber: updatedUser.phoneNumber,
          role: updatedUser.role,
          preferences: updatedUser.preferences
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Logout user
const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

module.exports = {
  register,
  verifyEmail,
  resendVerificationEmail,
  login,
  requestPasswordReset,
  resetPassword,
  changePassword,
  forceChangePassword,
  getCurrentUser,
  updateProfile,
  logout
};
