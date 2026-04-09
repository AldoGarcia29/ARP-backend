require('dotenv').config();
const pool = require('./db');

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Conexión OK:', result.rows[0]);
    process.exit(0);
  } catch (error) {
    console.error('Error de conexión:', error);
    process.exit(1);
  }
}

testConnection();