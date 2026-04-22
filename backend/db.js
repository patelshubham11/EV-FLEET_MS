const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ DATABASE CONNECTION ERROR: ${error.message}`);
    console.error('--------------------------------------------------');
    console.error('1. Check if your internet is working.');
    console.error('2. Ensure your IP address is whitelisted in MongoDB Atlas.');
    console.error('3. Verify that MONGO_URI in your .env file is correct.');
    console.error('--------------------------------------------------');
    // Don't exit, let the server stay up so the user can see the logs
  }
};

module.exports = connectDB;
