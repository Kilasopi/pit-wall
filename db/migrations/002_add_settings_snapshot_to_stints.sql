-- The outgoing driver's dc* (driver control) settings as of their last
-- telemetry tick, captured at stint swap so the next driver can reference
-- what the previous one had dialed in.
ALTER TABLE stints ADD COLUMN IF NOT EXISTS settings_snapshot JSONB;
