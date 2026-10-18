import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/spms';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000
    });
    console.log(`[Database] Connected to MongoDB: ${conn.connection.host}`);
    return true;
  } catch (err) {
    console.info(`[Database] MongoDB server not active on ${uri}. Using persistent embedded document engine.`);
    return false;
  }
};
