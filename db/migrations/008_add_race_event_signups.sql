-- Registration stage: a driver declares interest in a race_event and
-- picks a car class, before any team/car/timeslot is decided. Later
-- promoted into entry_drivers once teams are formed (see
-- race_event_teams in a follow-up migration).
CREATE TABLE race_event_signups (
    id SERIAL PRIMARY KEY,
    race_event_id INT NOT NULL REFERENCES race_events(id) ON DELETE CASCADE,
    driver_id INT REFERENCES murder_drivers(id),
    guest_name TEXT,
    guest_iracing_id TEXT,
    guest_timezone TEXT,
    car_class TEXT NOT NULL,
    signed_up_at TIMESTAMPTZ DEFAULT now(),
    CHECK (num_nonnulls(driver_id, guest_name) = 1)
);