-- Adds team identity to stint/incident/fuel history so multiple MURDER
-- entries running concurrent sessions don't share history. entry_name
-- matches entry_drivers.entry_name (e.g. "MURDER-Test"), resolved by the
-- agent from car number rather than any manual per-machine config.
ALTER TABLE stints ADD COLUMN IF NOT EXISTS entry_name TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS entry_name TEXT;
ALTER TABLE fuel_readings ADD COLUMN IF NOT EXISTS entry_name TEXT;
