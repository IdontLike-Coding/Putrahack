-- schema.sql: Database schema for AgriGuard AI

-- Drop table if exists to allow re-initialization
DROP TABLE IF EXISTS diagnoses;

CREATE TABLE diagnoses (
    id SERIAL PRIMARY KEY,
    label VARCHAR(255) NOT NULL,
    risk VARCHAR(50) NOT NULL,
    risk_class VARCHAR(50) NOT NULL,
    confidence VARCHAR(50) NOT NULL,
    factor TEXT,
    suggestion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Create a table for field sensors to track historical data
CREATE TABLE sensor_readings (
    id SERIAL PRIMARY KEY,
    temperature NUMERIC,
    moisture NUMERIC,
    ph NUMERIC,
    wind_speed NUMERIC,
    captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
