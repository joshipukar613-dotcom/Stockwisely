const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB Memory Server using the same method as the server
async function activateUser() {
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    
    console.log('🚀 Starting MongoDB Memory Server...');
    const mongoServer = await MongoMemoryServer.create();
    const mongoURI = mongoServer.getUri() + 'stock-wisely';
    console.log('✅ MongoDB Memory Server started');
    console.log('📊 Connection URI:', mongoURI);
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    const user = await User.findOne({ email: 'test@example.com' }).select('+password');
    
    if (user) {
      console.log('User found:');
      console.log('- Email:', user.email);
      console.log('- Account Status:', user.accountStatus);
      console.log('- Email Verified:', user.isEmailVerified);
      console.log('- Password exists:', !!user.password);
      
      // Activate the user for testing
      user.accountStatus = 'active';
      user.isEmailVerified = true;
      await user.save();
      console.log('- User activated successfully!');
      
    } else {
      console.log('User not found');
    }
    
    await mongoose.connection.close();
    await mongoServer.stop();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

activateUser();