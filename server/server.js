import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { seedInitialData } from './src/utils/seedData.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await seedInitialData();

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`  Student Project Monitoring System (SPMS) Backend  `);
      console.log(`  Running on: http://localhost:${PORT}              `);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to start SPMS server:', err);
    process.exit(1);
  }
};

startServer();
