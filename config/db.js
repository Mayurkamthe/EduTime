const mongoose = require('mongoose');

const connectDB = async () => {
  console.log('[DB] Connecting to MongoDB...');
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`[DB] ✅ MongoDB connected: ${conn.connection.host}`);
    console.log(`[DB] Database name: ${conn.connection.name}`);

    mongoose.connection.on('disconnected', () => {
      console.warn('[DB] ⚠️  MongoDB disconnected');
    });
    mongoose.connection.on('reconnected', () => {
      console.log('[DB] 🔄 MongoDB reconnected');
    });
    mongoose.connection.on('error', (err) => {
      console.error('[DB] ❌ MongoDB error:', err.message);
    });
  } catch (err) {
    console.error('[DB] ❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
