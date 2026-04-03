// server.js: Node.js/Express backend for AgriGuard AI

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 3001;

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(cors());
app.use(express.json());

// API Routes

// 1. Get Diagnosis History
app.get('/api/history', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM diagnoses ORDER BY created_at DESC LIMIT 10');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 2. Save New Diagnosis
app.post('/api/diagnose', async (req, res) => {
  const { label, risk, riskClass, confidence, factor, suggestion } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO diagnoses (label, risk, risk_class, confidence, factor, suggestion) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [label, risk, riskClass, confidence, factor, suggestion]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 3. Get Latest Sensor Reading
app.get('/api/sensors/latest', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sensor_readings ORDER BY captured_at DESC LIMIT 1');
    res.json(result.rows[0] || { temperature: 25, moisture: 50, ph: 6.5, wind_speed: 10 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 4. Save New Sensor Reading
app.post('/api/sensors', async (req, res) => {
  const { temperature, moisture, ph, windSpeed } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO sensor_readings (temperature, moisture, ph, wind_speed) VALUES ($1, $2, $3, $4) RETURNING *',
      [temperature, moisture, ph, windSpeed]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 5. Simple User Profile (Static for Prototypes)
app.get('/api/user', (req, res) => {
  res.json({
    id: 1,
    name: 'Farmer Joe',
    field: 'Sector A-C',
    level: 'Advanced',
    totalScans: 42
  });
});

app.listen(port, () => {
  console.log(`AgriGuard Backend running at http://localhost:${port}`);
});
