import { Pool } from '@neondatabase/serverless';
import fs from 'fs';

async function initDb() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const schemaSql = fs.readFileSync('db/migrations/001_init.sql', 'utf8');
    
    console.log("Running schema initialization...");
    await pool.query(schemaSql);
    
    console.log("Database initialized successfully!");
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDb();

