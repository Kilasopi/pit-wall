ALTER TABLE murder_drivers
  ADD COLUMN garage61_access_token TEXT,
  ADD COLUMN garage61_refresh_token TEXT,
  ADD COLUMN garage61_token_expires_at TIMESTAMPTZ;