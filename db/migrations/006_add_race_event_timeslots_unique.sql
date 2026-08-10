-- Same idempotency guard as race_series (source, name) and race_events
-- (race_series_id, week): fetchScheduleEvents runs repeatedly (like
-- fetchSpecialEvents), so timeslots need their own uniqueness or every
-- re-fetch would insert duplicates for the same event.
ALTER TABLE race_event_timeslots ADD CONSTRAINT race_event_timeslots_event_start_key UNIQUE (race_event_id, start_at);