ALTER TABLE race_event_teams
  ADD COLUMN quali_signup_id INTEGER REFERENCES race_event_signups(id) ON DELETE SET NULL;