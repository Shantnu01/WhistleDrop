const bcrypt = require('bcrypt');
const { Client } = require('pg');
const { env } = require('./src/config/env');

async function createAdmin() {
  const client = new Client({
    connectionString: env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Check if admin exists
    const checkRes = await client.query("SELECT id FROM moderators WHERE username = 'admin'");
    if (checkRes.rows.length > 0) {
      console.log('Admin user already exists!');
      return;
    }

    // Create admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await client.query(
      "INSERT INTO moderators (username, password) VALUES ($1, $2)",
      ['admin', hashedPassword]
    );

    console.log('✅ Success! Admin created.');
    console.log('Username: admin');
    console.log('Password: admin123');

  } catch (err) {
    console.error('Failed to create admin. Is PostgreSQL running?', err.message);
  } finally {
    await client.end();
  }
}

createAdmin();
