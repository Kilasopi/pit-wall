CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Many-to-many: most drivers belong to one team, but a driver can be on
-- both during a transition period (e.g. moving from one team to another).
CREATE TABLE team_memberships (
    driver_id INT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    PRIMARY KEY (driver_id, team_id)
);

INSERT INTO teams (name) VALUES ('MURDER'), ('Whiskey River Racing');
