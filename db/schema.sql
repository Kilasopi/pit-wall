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

CREATE TABLE murder_drivers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    nickname TEXT,
    iracing_id TEXT,
    active BOOLEAN DEFAULT true,
    city TEXT,
    timezone TEXT
);

-- Cleared out by the app when an event finishes; murder_drivers persists.
-- entry_name distinguishes which car/team when multiple MURDER entries
-- run the same event (e.g. "MURDER1", "MURDER2").
CREATE TABLE entry_drivers (
    id SERIAL PRIMARY KEY,
    driver_id INT REFERENCES murder_drivers(id),
    guest_name TEXT,
    event_name TEXT NOT NULL,
    entry_name TEXT NOT NULL,
    car_number TEXT,
    CHECK (num_nonnulls(driver_id, guest_name) = 1)
);