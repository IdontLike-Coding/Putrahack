-- schema.sql: Database schema for AgriGuard

-- Drop tables if exist to allow re-initialization
DROP TABLE IF EXISTS sensor_readings;
DROP TABLE IF EXISTS fields;
DROP TABLE IF EXISTS diagnoses;

CREATE TABLE fields (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE diagnoses (
    id SERIAL PRIMARY KEY,
    label VARCHAR(255) NOT NULL,
    risk VARCHAR(50) NOT NULL,
    risk_class VARCHAR(50) NOT NULL,
    confidence VARCHAR(50) NOT NULL,
    factor TEXT,
    suggestion TEXT,
    image_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sensor_readings (
    id SERIAL PRIMARY KEY,
    field_id INTEGER REFERENCES fields(id) ON DELETE CASCADE,
    field_name VARCHAR(255),
    temperature NUMERIC,
    moisture NUMERIC, -- Can maps to Humidity from Weather API
    ph NUMERIC,       -- Simulated soil pH
    wind_speed NUMERIC,
    captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
