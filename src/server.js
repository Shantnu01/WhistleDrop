const { env } = require('./config/env');
const db = require('./config/db');
const { connectRedis } = require('./config/redis');

const startServer = async () => {
  try {
    // 1. Connect to PostgreSQL
    await db.query('SELECT 1'); // Ping DB to ensure connection works
    console.log('Connected to PostgreSQL database successfully.');

    // 2. Connect to Redis
    await connectRedis();

    // 3. Load Express App (Requires Redis to be connected for rate-limiter)
    const app = require('./app');

    // 4. Start Express server
    app.listen(env.PORT, () => {
      console.log(`Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
