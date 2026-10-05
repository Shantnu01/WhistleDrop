const cluster = require('node:cluster');
const os = require('node:os');
const { env } = require('./config/env');
const db = require('./config/db');
const { connectRedis } = require('./config/redis');

const isClusterEnabled = process.env.CLUSTER_MODE === 'true';

if (isClusterEnabled && cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`🚀 [Cluster Master] PID ${process.pid} is running.`);
  console.log(`⚡ Forking ${numCPUs} worker processes to utilize all CPU cores...`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.warn(`⚠️ Worker ${worker.process.pid} died. Automatically respawning replacement worker...`);
    cluster.fork();
  });
} else {
  const startServer = async () => {
    try {
      // 1. Connect to PostgreSQL
      await db.query('SELECT 1');
      console.log(`[Worker ${process.pid}] Connected to PostgreSQL database successfully.`);

      // 2. Connect to Redis
      await connectRedis();

      // 3. Load Express App (Requires Redis to be connected for rate-limiter)
      const app = require('./app');

      // 4. Start Express server
      app.listen(env.PORT, () => {
        console.log(`[Worker ${process.pid}] Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      });
    } catch (error) {
      console.error(`[Worker ${process.pid}] Failed to start server:`, error);
      process.exit(1);
    }
  };

  startServer();
}
