CREATE TABLE stints (
    id SERIAL PRIMARY KEY,
    driver TEXT NOT NULL,
    car_number TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    laps_completed INT DEFAULT 0,
    fuel_used_est NUMERIC
);

CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    logged_at TIMESTAMPTZ DEFAULT now(),
    lap INT,
    description TEXT NOT NULL
);

CREATE TABLE fuel_readings (
    id SERIAL PRIMARY KEY,
    stint_id INT REFERENCES stints(id),
    logged_at TIMESTAMPTZ DEFAULT now(),
    laps_remaining_est NUMERIC,
    source TEXT
);