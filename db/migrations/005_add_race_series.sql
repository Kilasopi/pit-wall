-- Series-level data (e.g. "Creventic Endurance Series") used to live
-- flattened onto race_events, but a series spans many weeks at different
-- tracks/lengths, so it needs its own table. race_events now represents
-- one week of a series (see fetchScheduleEvents in
-- relay/iRacingScheduleScraper.js), and race_event_timeslots holds that
-- week's several same-race start times.
--
-- source moves entirely to race_series: it describes how the series
-- entered the system (scraped PDF, iRacing special-events page, manual
-- entry), not something that varies week to week within it. car_classes
-- is likewise series-wide, not per-week.
CREATE TABLE IF NOT EXISTS race_series (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('special_event', 'schedule_pdf', 'manual')),
    car_classes TEXT[],
    UNIQUE (source, name)
);

ALTER TABLE race_events ADD COLUMN IF NOT EXISTS race_series_id INT REFERENCES race_series(id) ON DELETE CASCADE;
ALTER TABLE race_events ADD COLUMN IF NOT EXISTS week INT;
ALTER TABLE race_events ADD COLUMN IF NOT EXISTS length_minutes INT;
ALTER TABLE race_events DROP COLUMN IF EXISTS car_classes;
ALTER TABLE race_events DROP COLUMN IF EXISTS source;

-- name/source uniqueness moved to race_series; race_events now guards
-- against the same series/week being inserted twice on re-fetch instead.
ALTER TABLE race_events DROP CONSTRAINT IF EXISTS race_events_source_name_key;
ALTER TABLE race_events ADD CONSTRAINT race_events_series_week_key UNIQUE (race_series_id, week);