const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to the same MongoDB Memory Server instance
async function checkUser() {
  try {
    // Use the same connection as the server
    await mongoose.connect('mongodb://127.0.0.1:27017/stock-wisely');
    
    const user = await User.findOne({ email: 'test@example.com' }).select('+password');
    
    if (user) {
      console.log('User found:');
      console.log('- Email:', user.email);
      console.log('- Account Status:', user.accountStatus);
      console.log('- Email Verified:', user.isEmailVerified);
      console.log('- Password exists:', !!user.password);
      console.log('- Created At:', user.createdAt);
      
      // Try to verify the password
      const bcrypt = require('bcryptjs');
      const isValid = await bcrypt.compare('password123', user.password);
      console.log('- Password valid:', isValid);
      
      // Activate the user for testing
      user.accountStatus = 'active';
      user.isEmailVerified = true;
      await user.save();
      console.log('- User activated for testing');
      
    } else {
      console.log('User not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUser();