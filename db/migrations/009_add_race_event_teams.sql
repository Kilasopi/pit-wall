CREATE TABLE race_event_teams (
  id SERIAL PRIMARY KEY,
  race_event_id INTEGER NOT NULL REFERENCES race_events(id),
  car_class TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE race_event_team_members (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES race_event_teams(id) ON DELETE CASCADE,
  signup_id INTEGER NOT NULL UNIQUE REFERENCES race_event_signups(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT now()
);