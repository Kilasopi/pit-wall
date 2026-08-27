CREATE TABLE race_event_availability_blocks (
    id SERIAL PRIMARY KEY,
    signup_id INTEGER NOT NULL REFERENCES race_event_signups(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('blackout', 'avoid')),
    reason TEXT
);