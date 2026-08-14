ALTER TABLE murder_drivers
    DROP COLUMN username,
    DROP COLUMN password_hash,
    DROP COLUMN discord_id,
    DROP COLUMN phone_number;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    discord_id TEXT,
    phone_number TEXT,
    driver_id INTEGER UNIQUE REFERENCES murder_drivers(id),
    created_at TIMESTAMP DEFAULT now()
);