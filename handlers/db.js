    // db.js
    const { Pool } = require('pg');
    require('dotenv').config();
    console.log('process.env.SUPABASE_DATABASE_URL');
    console.log(process.env.SUPABASE_DATABASE_URL);
    const pool = new Pool({
      connectionString: process.env.SUPABASE_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    module.exports = pool;
