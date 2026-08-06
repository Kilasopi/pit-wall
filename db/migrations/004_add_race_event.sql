-- race_events to allow us to query the upcoming race events
-- race_event_timeslots to store the timeslots of each race whether
-- they are entered manually or calculated for the regular season events

CREATE TABLE race_events (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    track TEXT,
    source TEXT NOT NULL CHECK (source IN ('special_event', 'schedule_pdf', 'manual')),
    car_classes TEXT[],
    UNIQUE (source, name)
);

CREATE TABLE race_event_timeslots (
    id SERIAL PRIMARY KEY,
    race_event_id INT NOT NULL REFERENCES race_events(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL
);