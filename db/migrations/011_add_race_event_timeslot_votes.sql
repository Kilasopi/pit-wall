CREATE TABLE race_event_timeslot_votes (
  id SERIAL PRIMARY KEY,
  timeslot_id INTEGER NOT NULL REFERENCES race_event_timeslots(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES race_event_teams(id) ON DELETE CASCADE,
  signup_id INTEGER NOT NULL REFERENCES race_event_signups(id) ON DELETE CASCADE,
  voted_at TIMESTAMP DEFAULT now(),
  UNIQUE (timeslot_id, signup_id)
);

ALTER TABLE race_event_teams
  ADD COLUMN locked_timeslot_id INTEGER REFERENCES race_event_timeslots(id);