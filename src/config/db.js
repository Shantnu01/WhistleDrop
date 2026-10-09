const { Pool } = require('pg');
const { env } = require('./env');

const isRemoteOrProduction = env.NODE_ENV === 'production' || (env.DATABASE_URL && !env.DATABASE_URL.includes('localhost'));

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: isRemoteOrProduction ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  // Expose standard query function
  query: (text, params) => pool.query(text, params),
  
  // Expose pool to allow getting a client for transactions
  getClient: () => pool.connect(),
};
