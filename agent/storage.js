// Postgres access for stint/fuel/incident history. Same schema relay
// already uses (db/schema.sql) — this only touches the stints,
// fuel_readings, incidents, and murder_drivers tables.
const { Pool } = require('pg');

function createStorage(databaseUrl) {
    const pool = new Pool({ connectionString: databaseUrl });

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

        async openStint({ driver, carNumber, startedAt }) {
            const { rows } = await pool.query(
                `INSERT INTO stints (driver, car_number, started_at, laps_completed)
                 VALUES ($1, $2, $3, 0)
                 RETURNING id`,
                [driver, carNumber ?? null, startedAt]
            );
            return rows[0].id;
        },

        async closeStint(stintId, { endedAt, lapsCompleted, fuelUsedEst }) {
            await pool.query(
                `UPDATE stints
                 SET ended_at = $1, laps_completed = $2, fuel_used_est = $3
                 WHERE id = $4`,
                [endedAt, lapsCompleted ?? null, fuelUsedEst ?? null, stintId]
            );
        },

        async updateStintLaps(stintId, lapsCompleted) {
            await pool.query('UPDATE stints SET laps_completed = $1 WHERE id = $2', [
                lapsCompleted,
                stintId,
            ]);
        },

        async insertFuelReading({ stintId, lapsRemainingEst, source }) {
            await pool.query(
                `INSERT INTO fuel_readings (stint_id, laps_remaining_est, source)
                 VALUES ($1, $2, $3)`,
                [stintId ?? null, lapsRemainingEst, source]
            );
        },

        async insertIncident({ lap, description, points }) {
            const { rows } = await pool.query(
                `INSERT INTO incidents (lap, description, points)
                 VALUES ($1, $2, $3)
                 RETURNING id, logged_at`,
                [lap ?? null, description, points]
            );
            return rows[0];
        },

        async close() {
            await pool.end();
        },
    };
}

module.exports = { createStorage };
