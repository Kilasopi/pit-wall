// Postgres access for stint/fuel/incident history. Same schema relay
// already uses (db/schema.sql) — this only touches the stints,
// fuel_readings, incidents, murder_drivers, and entry_drivers tables.
const { Pool } = require('pg');

function createStorage(databaseUrl) {
    // Managed providers (Neon, etc.) put sslmode=require in the connection
    // string and need an explicit ssl option — the local Docker postgres
    // doesn't speak TLS at all, so this only turns on when the URL asks for it.
    const useSsl = /sslmode=require/.test(databaseUrl || '');
    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    });

    return {
        async findDriverNameByIracingId(iracingId) {
            if (!iracingId) return null;
            const { rows } = await pool.query(
                'SELECT name, nickname FROM murder_drivers WHERE iracing_id = $1',
                [String(iracingId)]
            );
            const driver = rows[0];
            if (!driver) return null;
            return driver.nickname || driver.name;
        },

        // Resolves which roster entry a car number belongs to, so the
        // agent can auto-detect team identity instead of needing per-Sim-PC
        // config. Multiple driver rows can share an entry_name/car_number;
        // any match is enough.
        async findEntryNameByCarNumber(carNumber) {
            if (!carNumber) return null;
            const { rows } = await pool.query(
                'SELECT entry_name FROM entry_drivers WHERE car_number = $1 LIMIT 1',
                [String(carNumber)]
            );
            return rows[0]?.entry_name ?? null;
        },

        async openStint({ driver, carNumber, entryName, startedAt }) {
            const { rows } = await pool.query(
                `INSERT INTO stints (driver, car_number, entry_name, started_at, laps_completed)
                 VALUES ($1, $2, $3, $4, 0)
                 RETURNING id`,
                [driver, carNumber ?? null, entryName ?? null, startedAt]
            );
            return rows[0].id;
        },

        async closeStint(stintId, { endedAt, lapsCompleted, fuelUsedEst, settingsSnapshot }) {
            await pool.query(
                `UPDATE stints
                 SET ended_at = $1, laps_completed = $2, fuel_used_est = $3, settings_snapshot = $4
                 WHERE id = $5`,
                [
                    endedAt,
                    lapsCompleted ?? null,
                    fuelUsedEst ?? null,
                    settingsSnapshot ? JSON.stringify(settingsSnapshot) : null,
                    stintId,
                ]
            );
        },

        async updateStintLaps(stintId, lapsCompleted) {
            await pool.query('UPDATE stints SET laps_completed = $1 WHERE id = $2', [
                lapsCompleted,
                stintId,
            ]);
        },

        async insertFuelReading({ stintId, entryName, lapsRemainingEst, source }) {
            await pool.query(
                `INSERT INTO fuel_readings (stint_id, entry_name, laps_remaining_est, source)
                 VALUES ($1, $2, $3, $4)`,
                [stintId ?? null, entryName ?? null, lapsRemainingEst, source]
            );
        },

        async insertIncident({ entryName, lap, description, points, sessionKey }) {
            const { rows } = await pool.query(
                `INSERT INTO incidents (entry_name, lap, description, points, session_key)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id, logged_at`,
                [entryName ?? null, lap ?? null, description, points, sessionKey ?? null]
            );
            return rows[0];
        },

        async getIncidentsForSession(entryName, sessionKey) {
            const { rows } = await pool.query(
                `SELECT lap, description, points
                 FROM incidents
                 WHERE entry_name = $1 AND session_key = $2
                 ORDER BY logged_at ASC`,
                [entryName, sessionKey]
            );
            return rows;
        },

        async close() {
            await pool.end();
        },
    };
}

module.exports = { createStorage };
