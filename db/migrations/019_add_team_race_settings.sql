ALTER TABLE race_event_teams
  ADD COLUMN race_start_at TIMESTAMPTZ,
  ADD COLUMN race_length_minutes INTEGER,
  ADD COLUMN practice_minutes INTEGER,
  ADD COLUMN quali_minutes INTEGER;