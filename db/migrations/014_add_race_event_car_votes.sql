-- Car voting stage: once a team's timeslot is settled, each member votes
-- on which car to run within their class. car_name is free text, not an
-- FK/enum, for the same reason as race_event_signups.car_class — car
-- lists per class aren't a fixed known set yet.
CREATE TABLE race_event_car_votes (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES race_event_teams(id) ON DELETE CASCADE,
    signup_id INTEGER NOT NULL REFERENCES race_event_signups(id) ON DELETE CASCADE,
    car_name TEXT NOT NULL,
    voted_at TIMESTAMP DEFAULT now(),
    UNIQUE (team_id, signup_id)
);