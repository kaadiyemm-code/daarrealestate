const mongoose = require('mongoose');
if (!process.env.MONGO_URI) {
  require('dotenv').config();
}

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/realestate';
  try {
    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`Primary MongoDB Connection Warning: ${error.message}`);
    
    // In local dev/test, fallback to local MongoDB if primary fails
    const localUri = 'mongodb://127.0.0.1:27017/realestate';
    if (primaryUri !== localUri) {
      try {
        console.log(`Attempting fallback connection to local MongoDB: ${localUri}`);
        const localConn = await mongoose.connect(localUri, {
          serverSelectionTimeoutMS: 3000,
        });
        console.log(`MongoDB Connected (Local Fallback): ${localConn.connection.host}`);
        return localConn;
      } catch (localError) {
        console.error(`Local MongoDB fallback also failed: ${localError.message}`);
      }
    }
    
    console.error('Fatal: Could not connect to any MongoDB instance. Please check your MONGO_URI or whitelist your IP in MongoDB Atlas.');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
