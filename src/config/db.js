const { Pool } = require('pg');
const { env } = require('./env');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
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
