// init-db.js: Initialize the database schema for AgriGuard (Neon)

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
    
    // 1. Seed Fields
    const fieldResult = await pool.query(`
      INSERT INTO fields (name, location, latitude, longitude) 
      VALUES 
      ('Field A', 'Penang, MY', 5.4164, 100.3301),
      ('Field B', 'Kedah, MY', 6.13491, 100.283)
      RETURNING id
    `);
    const fieldAId = fieldResult.rows[0].id;
    const fieldBId = fieldResult.rows[1].id;
    console.log("Seeded initial fields.");

    // 2. Seed Diagnoses
    await pool.query(`
      INSERT INTO diagnoses (label, risk, risk_class, confidence, factor, suggestion) 
      VALUES 
      ('Healthy Leaf', 'Safe', 'safe', '98%', 'Optimal environment.', 'Maintain current routine.'),
      ('Early Blight', 'High Risk', 'danger', '82%', 'Fungal infection.', 'Apply copper fungicide.')
    `);
    console.log("Seeded initial diagnoses.");

    // 3. Seed Sensors (Recent Readings)
    await pool.query(`
      INSERT INTO sensor_readings (field_id, field_name, temperature, moisture, ph, wind_speed)
      VALUES
      ($1, 'Field A', 28, 65, 6.4, 12),
      ($2, 'Field B', 34, 22, 6.8, 18)
    `, [fieldAId, fieldBId]);
    console.log("Seeded initial sensor readings.");
    
  } catch (err) {
    console.error("Error initializing database:", err);
  } finally {
    await pool.end();
  }
}

initializeDatabase();
