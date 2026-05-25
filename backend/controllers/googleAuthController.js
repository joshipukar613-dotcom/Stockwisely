const userRepository = require('../repositories/userRepository');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Google OAuth callback
const googleCallback = (req, res) => {
  // This function is called after successful Google authentication
  // The user object is available in req.user from Passport
  
  // Decode state to get returnTo URL
  let clientUrl = process.env.CLIENT_URL;
  if (req.query.state) {
    try {
      const state = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
      if (state.returnTo) clientUrl = state.returnTo;
    } catch (e) {
      console.error('Failed to parse state:', e);
    }
  }

  if (!req.user) {
    return res.redirect(`${clientUrl}/signin?error=authentication_failed`);
  }

  try {
    const user = req.user;
    const token = generateToken(user.id);

    // Redirect to frontend with token and user data
    const redirectUrl = `${clientUrl}/auth/google/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      businessName: user.businessName,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      accountStatus: user.accountStatus,
      forcePasswordChange: user.mustChangePassword || false
    }))}`;

    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${clientUrl}/signin?error=server_error`);
  }
};

// Get Google OAuth URL
const getGoogleAuthUrl = (req, res) => {
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_CALLBACK_URL}&response_type=code&scope=profile email`;
  
  res.json({
    success: true,
    data: { authUrl: googleAuthUrl }
  });
};

// Connect Google account to existing user
const connectGoogleAccount = async (req, res) => {
  try {
    const { googleId, email, googleData } = req.body;
    const userId = req.user.userId;

    // Find user
    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if Google account is already connected to another user
    const existingGoogleUser = await userRepository.findByGoogleId(googleId);
    if (existingGoogleUser && existingGoogleUser.id !== userId) {
      return res.status(400).json({
        success: false,
        message: 'This Google account is already connected to another user'
      });
    }

    // Update user with Google information
    const updateData = {
      googleId: googleId,
      isEmailVerified: true // Google emails are verified
    };
    
    // Update profile picture if available
    if (googleData.picture) {
      updateData.avatar = googleData.picture;
    }

    await userRepository.update(userId, updateData);

    // Get updated user
    const updatedUser = await userRepository.findById(userId);

    res.json({
      success: true,
      message: 'Google account connected successfully',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          businessName: updatedUser.businessName,
          isEmailVerified: updatedUser.isEmailVerified,
          avatar: updatedUser.avatar
        }
      }
    });
  } catch (error) {
    console.error('Connect Google account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect Google account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Disconnect Google account
const disconnectGoogleAccount = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find user
    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has a password (can't disconnect Google if it's the only auth method)
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'Cannot disconnect Google account. Please set a password first.'
      });
    }

    // Prepare update data
    const updateData = {
      googleId: null
    };
    
    // Remove profile picture if it was from Google
    if (user.avatar && user.avatar.includes('googleusercontent.com')) {
      updateData.avatar = null;
    }

    await userRepository.update(userId, updateData);

    // Get updated user
    const updatedUser = await userRepository.findById(userId);

    res.json({
      success: true,
      message: 'Google account disconnected successfully',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          businessName: updatedUser.businessName,
          isEmailVerified: updatedUser.isEmailVerified,
          avatar: updatedUser.avatar
        }
      }
    });
  } catch (error) {
    console.error('Disconnect Google account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Google account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  googleCallback,
  getGoogleAuthUrl,
  connectGoogleAccount,
  disconnectGoogleAccount
};
