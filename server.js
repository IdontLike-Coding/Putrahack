// server.js: Node.js/Express backend for AgriGuard

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

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Successfully connected to Neon PostgreSQL database');
  release();
});

app.use(cors());
app.use(express.json());

// API Routes

// 0. Fields Management
app.get('/api/fields', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM fields ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Database Error (Fields):', err);
    res.status(500).json({ error: 'Database error fetching fields' });
  }
});

app.post('/api/fields', async (req, res) => {
  const { name, location, latitude, longitude } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO fields (name, location, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, location, latitude, longitude]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Database Error (Add Field):', err);
    res.status(500).json({ error: 'Database error adding field' });
  }
});

// 1. Get Diagnosis History
app.get('/api/history', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM diagnoses ORDER BY created_at DESC LIMIT 10');
    res.json(result.rows);
  } catch (err) {
    console.error('Database Error (History):', err);
    res.status(500).json({ error: 'Database error fetching history', details: err.message });
  }
});

// 2. Save New Diagnosis
app.post('/api/diagnose', async (req, res) => {
  const { label, risk, riskClass, confidence, factor, suggestion, image_data } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO diagnoses (label, risk, risk_class, confidence, factor, suggestion, image_data) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [label, risk, riskClass, confidence, factor, suggestion, image_data]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Database Error (Save Diagnosis):', err);
    res.status(500).json({ error: 'Database error saving diagnosis', details: err.message });
  }
});

// 3. Get Latest Sensor Reading
app.get('/api/sensors/latest', async (req, res) => {
  const { field_id } = req.query;
  try {
    let query = 'SELECT * FROM sensor_readings ORDER BY captured_at DESC LIMIT 1';
    let params = [];
    if (field_id) {
       query = 'SELECT * FROM sensor_readings WHERE field_id = $1 ORDER BY captured_at DESC LIMIT 1';
       params = [field_id];
    }
    const result = await pool.query(query, params);
    res.json(result.rows[0] || { temperature: 25, moisture: 50, ph: 6.5, wind_speed: 10 });
  } catch (err) {
    console.error('Database Error (Latest Sensors):', err);
    res.status(500).json({ error: 'Database error fetching sensor data', details: err.message });
  }
});

// 4. Save New Sensor Reading
app.post('/api/sensors', async (req, res) => {
  const { field_id, field_name, temperature, moisture, ph, windSpeed } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO sensor_readings (field_id, field_name, temperature, moisture, ph, wind_speed) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [field_id, field_name, temperature, moisture, ph, windSpeed]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Database Error (Save Sensors):', err);
    res.status(500).json({ error: 'Database error saving sensor reading', details: err.message });
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

// 6. Wind Data Proxy (Windy.com with Open-Meteo fallback)
app.get('/api/weather/wind', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });

  // Try Windy.com first
  try {
    const requestBody = {
      lat: parseFloat(parseFloat(lat).toFixed(2)),
      lon: parseFloat(parseFloat(lon).toFixed(2)),
      model: 'gfs',
      parameters: ['wind', 'gust'],
      levels: ['surface'],
      key: process.env.WINDY_API_KEY
    };

    const windyRes = await fetch('https://api.windy.com/api/point-forecast/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (windyRes.ok) {
      const data = await windyRes.json();
      console.log('Windy API success, keys:', Object.keys(data));

      const windU = data['wind_u-surface']?.[0] || 0;
      const windV = data['wind_v-surface']?.[0] || 0;
      const gust = data['gust-surface']?.[0] || 0;

      const speedMs = Math.sqrt(windU * windU + windV * windV);
      const speedKmh = (speedMs * 3.6).toFixed(1);
      const gustKmh = (gust * 3.6).toFixed(1);

      const dirDeg = ((Math.atan2(-windU, -windV) * 180) / Math.PI + 360) % 360;
      const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
      const dirLabel = dirs[Math.round(dirDeg / 22.5) % 16];

      return res.json({
        speed: parseFloat(speedKmh),
        gust: parseFloat(gustKmh),
        direction: Math.round(dirDeg),
        directionLabel: dirLabel,
        source: 'Windy.com'
      });
    }

    console.warn('Windy API returned', windyRes.status, '— falling back to Open-Meteo');
  } catch (e) {
    console.warn('Windy API failed, falling back to Open-Meteo:', e.message);
  }

  // Fallback: Open-Meteo (free, no key needed)
  try {
    const meteoRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m`);
    const meteoData = await meteoRes.json();
    const cur = meteoData.current;

    const dirDeg = cur.wind_direction_10m || 0;
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    const dirLabel = dirs[Math.round(dirDeg / 22.5) % 16];

    return res.json({
      speed: cur.wind_speed_10m || 0,
      gust: cur.wind_gusts_10m || 0,
      direction: Math.round(dirDeg),
      directionLabel: dirLabel,
      source: 'Open-Meteo'
    });
  } catch (err) {
    console.error('All wind APIs failed:', err);
    res.status(500).json({ error: 'Failed to fetch wind data', details: err.message });
  }
});

app.listen(port, () => {
  console.log(`AgriGuard Backend running at http://localhost:${port}`);
});
