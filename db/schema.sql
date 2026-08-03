-- entry_name ties a row to one entry_drivers.entry_name (e.g.
-- "MURDER-Test") so multiple concurrent entries don't share history. The
-- agent resolves it from car number, not any manual per-machine config.
CREATE TABLE stints (
    id SERIAL PRIMARY KEY,
    driver TEXT NOT NULL,
    car_number TEXT,
    entry_name TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    laps_completed INT DEFAULT 0,
    fuel_used_est NUMERIC
);

CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    logged_at TIMESTAMPTZ DEFAULT now(),
    entry_name TEXT,
    lap INT,
    description TEXT NOT NULL,
    -- iRacing incident points for this single incident: 0x/1x/2x/4x.
    points INT NOT NULL DEFAULT 0 CHECK (points IN (0, 1, 2, 4))
);

CREATE TABLE fuel_readings (
    id SERIAL PRIMARY KEY,
    stint_id INT REFERENCES stints(id),
    entry_name TEXT,
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
    country TEXT,
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
    car_type TEXT CHECK (car_type IS NULL OR car_type IN ('GTP', 'LMP2', 'GT3', 'GT4')),
    -- Stint planning: race_start_at and race_length_minutes are shared across
    -- every row for the same (event_name, entry_name); stint_order determines
    -- driving order and stint_minutes is that driver's planned stint length.
    race_start_at TIMESTAMPTZ,
    race_length_minutes INT,
    -- Alternate way to define the full schedule: a fixed number of stints of
    -- a uniform length, instead of deriving stint count from race length.
    race_stint_count INT,
    race_stint_minutes INT,
    stint_order INT,
    stint_minutes INT,
    CHECK (num_nonnulls(driver_id, guest_name) = 1)
);