-- race_event_teams was missing ON DELETE CASCADE on race_event_id, unlike
-- race_event_signups/race_event_team_members. That meant deleting a
-- race_event with teams already assigned to it (e.g. a special event that
-- drops off iRacing's listing after it has already run) threw a foreign
-- key violation, which silently aborted the *entire* special-events
-- refresh cycle every time it ran, for every event, not just the stuck one.
ALTER TABLE race_event_teams DROP CONSTRAINT race_event_teams_race_event_id_fkey;
ALTER TABLE race_event_teams ADD CONSTRAINT race_event_teams_race_event_id_fkey
    FOREIGN KEY (race_event_id) REFERENCES race_events(id) ON DELETE CASCADE;
