const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const userRepository = require('../repositories/userRepository');

// Get all users - ADMIN only
const getAllUsers = async (req, res) => {
  try {
    const users = await userRepository.findAll();
    
    // Remove sensitive information
    const sanitizedUsers = users.map(user => {
      const { password, resetToken, ...sanitizedUser } = user;
      return sanitizedUser;
    });

    res.status(200).json({
      success: true,
      data: sanitizedUsers
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

// Create user - ADMIN only
const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, role, businessName, phoneNumber, businessType } = req.body;

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email address'
      });
    }

    // Generate temp password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // Create user
    const newUser = await userRepository.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: role || 'SALES_CLERK',
      businessName,
      phoneNumber,
      businessType,
      createdBy: req.user.id
    });

    // Update with mustChangePassword flag
    await userRepository.update(newUser.id, {
      mustChangePassword: true
    });

    // In a real app, send email with temp password here
    // For now, we'll return it in the response (only in dev/admin context)
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: newUser.id,
        email: newUser.email,
        tempPassword // Return temp password to admin so they can give it to the user
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
};

// Update user role - ADMIN only
const updateRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Prevent admin from changing their own role
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role'
      });
    }

    if (!['ADMIN', 'MANAGER', 'SALES_CLERK'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    await userRepository.update(userId, { role });

    res.status(200).json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role'
    });
  }
};

// Toggle user status (active/inactive) - ADMIN only
const toggleStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    // Prevent admin from deactivating their own account
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    await userRepository.update(userId, { isActive });

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
};

// Reset user password - ADMIN only
const resetUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;

    // Generate temp password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    await userRepository.update(userId, {
      password: hashedPassword,
      mustChangePassword: true
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      data: { tempPassword }
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset user password'
    });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateRole,
  toggleStatus,
  resetUserPassword
};
