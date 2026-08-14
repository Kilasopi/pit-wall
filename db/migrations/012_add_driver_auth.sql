ALTER TABLE murder_drivers
    ADD COLUMN username TEXT UNIQUE, 
    ADD COLUMN password_hash TEXT,
    ADD COLUMN discord_id TEXT,
    ADD COLUMN phone_number TEXT;