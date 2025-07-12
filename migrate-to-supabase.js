// Migration script to test Supabase connection and run SQL schema
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres:lolilolkoiA1!@@db.uctvyjsxmfxxyusdkkgd.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  try {
    console.log('🔌 Connecting to Supabase...');
    const client = await pool.connect();
    
    console.log('✅ Connected to Supabase PostgreSQL!');
    
    // Test simple query
    const result = await client.query('SELECT version()');
    console.log('📊 Database version:', result.rows[0].version);
    
    // Check if tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('📋 Existing tables:', tables.rows.map(r => r.table_name));
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

testConnection();