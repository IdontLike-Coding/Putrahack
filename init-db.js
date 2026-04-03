// init-db.js: Initialize the database schema for Neon

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initializeDatabase() {
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    console.log("Connecting to Neon database...");
    
    await pool.query(schemaSql);
    console.log("Database schema initialized successfully.");
    
    // Seed some initial data for history
    await pool.query(`
      INSERT INTO diagnoses (label, risk, risk_class, confidence, factor, suggestion) 
      VALUES 
      ('Healthy Leaf', 'Safe', 'safe', '98%', 'Optimal environment.', 'Maintain current routine.'),
      ('Early Blight', 'High Risk', 'danger', '82%', 'Fungal infection.', 'Apply copper fungicide.')
    `);
    console.log("Seeded initial data.");
    
  } catch (err) {
    console.error("Error initializing database:", err);
  } finally {
    await pool.end();
  }
}

initializeDatabase();
