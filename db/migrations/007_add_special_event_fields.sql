-- Special events (Portimao 1000 etc.) reuse race_series/race_events like
-- the regular schedule does, but need fields the schedule scraper never
-- populates: distance_km (already computed by specialEventsScraper.js but
-- never persisted) and the overall event date range, which is known from
-- the special-events listing page before individual timeslots are ever
-- published in the "This Week in iRacing" news post.
ALTER TABLE race_events ADD COLUMN IF NOT EXISTS distance_km INT;
ALTER TABLE race_events ADD COLUMN IF NOT EXISTS event_start_date DATE;
ALTER TABLE race_events ADD COLUMN IF NOT EXISTS event_end_date DATE;
