-- Incidents previously had no notion of which iRacing session they came
-- from, so restarting the agent mid-testing (or mid-race) had no way to
-- tell "still this race" apart from "an unrelated session from last week"
-- for the same entry_name. session_key identifies the current session
-- (WeekendInfo SubSessionID/SessionID/TrackID, see agent/index.js
-- sessionKeyFor), so history can be scoped to just the running race.
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS session_key TEXT;
