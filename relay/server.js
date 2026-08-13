require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const { WebSocketServer } = require('ws');
const { Pool } = require('pg');

const { fetchScheduleEvents } = require('./iRacingScheduleScraper.js');
const { fetchSpecialEvents } = require('./specialEventsScraper.js');

const app = express();
app.use(cors());
app.use(express.json());
// Managed providers (Neon, etc.) put sslmode=require in the connection
// string and need an explicit ssl option — the local Docker postgres
// doesn't speak TLS at all, so this only turns on when the URL asks for it.
const useSsl = /sslmode=require/.test(process.env.DATABASE_URL || '');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

app.get('/api/murder-drivers', async (req, res) => {
    const { rows } = await pool.query(
        'SELECT id, name, nickname, iracing_id, active, city, country, timezone FROM murder_drivers ORDER BY name'
    );
    res.json(rows);
});

app.get('/api/entry-drivers', async (req, res) => {
    const { rows } = await pool.query(`
        SELECT ed.id,
               ed.driver_id,
               ed.guest_name,
               COALESCE(md.name, ed.guest_name) AS driver_name,
               ed.driver_id IS NULL AS is_guest,
               md.timezone,
               ed.event_name,
               ed.entry_name,
               ed.car_number,
               ed.car_type,
               ed.race_start_at,
               ed.race_length_minutes,
               ed.race_stint_count,
               ed.race_stint_minutes,
               ed.stint_order,
               ed.stint_minutes
        FROM entry_drivers ed
        LEFT JOIN murder_drivers md ON md.id = ed.driver_id
        ORDER BY ed.event_name, ed.entry_name, ed.stint_order NULLS LAST, driver_name
    `);
    res.json(rows);
});

const server = app.listen(process.env.PORT || 4000, () =>
    console.log(`Relay listening on ${server.address().port}`)
);

const wss = new WebSocketServer({ server });
let latestState = null;

wss.on('connection', (ws) => {
    // Without this, a client connecting after the last publish sits blank
    // until the next one arrives — which can be minutes away for state that
    // only changes on stint/fuel/incident events rather than a fast tick.
    if (latestState) ws.send(JSON.stringify(latestState));

    ws.on('message', (raw) => {
        const msg = JSON.parse(raw);
        latestState = msg;
        broadcastToDashboards(latestState);
    });
});

function broadcastToDashboards(state) {
    wss.clients.forEach((client) => {
        if (client.readyState === 1) client.send(JSON.stringify(state));
    });
}
// =======
// Drivers
// =======

app.post('/api/entry-drivers', async (req,res) => {
    const { driverId, guestName, eventName, entryName, carNumber, carType, stintMinutes } = req.body;

    const { rows } = await pool.query(
        `INSERT INTO entry_drivers (driver_id, guest_name, event_name, entry_name, car_number, car_type, stint_minutes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [driverId ?? null, guestName ?? null, eventName, entryName, carNumber ?? null, carType ?? null, stintMinutes ?? null]
    )
    res.status(201).json(rows[0]);
});

app.delete('/api/entry-drivers', async (req, res) => {
    await pool.query('DELETE FROM entry_drivers');
    res.status(204).end();
});

// Adds another stint slot for the same driver (used for double/triple
// stinting), appended to the end of that entry's schedule.
app.post('/api/entry-drivers/:id/duplicate', async (req, res) => {
    const { rows: sourceRows } = await pool.query('SELECT * FROM entry_drivers WHERE id = $1', [
        req.params.id,
    ]);
    const source = sourceRows[0];
    if (!source) return res.status(404).json({ error: 'Entry driver not found' });

    const { rows: maxRows } = await pool.query(
        `SELECT COALESCE(MAX(stint_order), -1) AS max_order
         FROM entry_drivers WHERE event_name = $1 AND entry_name = $2`,
        [source.event_name, source.entry_name]
    );
    const nextOrder = maxRows[0].max_order + 1;

    const { rows } = await pool.query(
        `INSERT INTO entry_drivers
            (driver_id, guest_name, event_name, entry_name, car_number, car_type,
             race_start_at, race_length_minutes, race_stint_count, race_stint_minutes,
             stint_order, stint_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
            source.driver_id,
            source.guest_name,
            source.event_name,
            source.entry_name,
            source.car_number,
            source.car_type,
            source.race_start_at,
            source.race_length_minutes,
            source.race_stint_count,
            source.race_stint_minutes,
            nextOrder,
            source.stint_minutes,
        ]
    );
    res.status(201).json(rows[0]);
});

app.delete('/api/entry-drivers/:id', async (req, res) => {
    await pool.query('DELETE FROM entry_drivers WHERE id = $1', [req.params.id]);
    res.status(204).end();
});

app.patch('/api/entry-drivers/:id', async (req, res) => {
    const {
        raceStartAt,
        raceLengthMinutes,
        raceStintCount,
        raceStintMinutes,
        stintOrder,
        stintMinutes,
        carType,
        carNumber,
    } = req.body;

    const { rows } = await pool.query(
        `UPDATE entry_drivers
         SET race_start_at = COALESCE($1, race_start_at),
             race_length_minutes = COALESCE($2, race_length_minutes),
             race_stint_count = COALESCE($3, race_stint_count),
             race_stint_minutes = COALESCE($4, race_stint_minutes),
             stint_order = COALESCE($5, stint_order),
             stint_minutes = COALESCE($6, stint_minutes),
             car_type = COALESCE($7, car_type),
             car_number = COALESCE($8, car_number)
         WHERE id = $9
         RETURNING *`,
        [
            raceStartAt ?? null,
            raceLengthMinutes ?? null,
            raceStintCount ?? null,
            raceStintMinutes ?? null,
            stintOrder ?? null,
            stintMinutes ?? null,
            carType ?? null,
            carNumber ?? null,
            req.params.id,
        ]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Entry driver not found' });
    res.json(rows[0]);
});

app.post('/api/murder-drivers', async (req, res) => {
    const { name, nickname, iracingId, city, country, timezone } = req.body;

    const { rows } = await pool.query(
        `INSERT INTO murder_drivers (name, nickname, iracing_id, city, country, timezone)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [name, nickname ?? null, iracingId ?? null, city ?? null, country ?? null, timezone ?? null]
    )
    res.status(201).json(rows[0]);
});

app.patch('/api/murder-drivers/:id', async (req, res) => {
    try {
        const {
            name,
            nickname,
            iracingId,
            city,
            country,
            timezone,
            active,
        } = req.body;

        const { rows } = await pool.query(
            `UPDATE murder_drivers
             SET name = $1,
                 nickname = $2,
                 iracing_id = $3,
                 city = $4,
                 country = $5,
                 timezone = $6,
                 active = $7
             WHERE id = $8
             RETURNING *`,
            [
                name,
                nickname ?? null,
                iracingId ?? null,
                city ?? null,
                country ?? null,
                timezone ?? null,
                active,
                req.params.id,
            ]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Driver not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('Failed to update driver:', err);
        res.status(500).json({
            error: err.message || 'Failed to update driver',
        });
    }
});

app.delete('/api/murder-drivers/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM murder_drivers WHERE id = $1', [req.params.id]);
        res.status(204).end();
    } catch (err) {
        if (err.code === '23503') {
            // FK violation: this driver is referenced by entry_drivers rows
            return res.status(409).json({
                error: 'Driver is on an active event entry. Remove them from the event first.',
            });
        }
        throw err;
    }
});

// =======
// iRacing Regular Schedule (scraped from iRacing PDF)
// =======

async function saveScheduleEvents(results) {
    for (const series of results) {
        const { rows } = await pool.query(
            `INSERT INTO race_series (name, source, car_classes)
             VALUES ($1, $2, $3)
             ON CONFLICT (source, name)
             DO UPDATE SET car_classes = EXCLUDED.car_classes
             RETURNING id`,
            [series.name, series.source, series.carClasses ?? null]
        );
        const raceSeriesId = rows[0].id;

        for (const event of series.events) {
            const { rows } = await pool.query(
                `INSERT INTO race_events (name, track, race_series_id, week, length_minutes)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (race_series_id, week)
                DO UPDATE SET track = EXCLUDED.track, length_minutes = EXCLUDED.length_minutes
                RETURNING id`,
                [`${series.name} - Week ${event.week}`, event.track, raceSeriesId, event.week, event.lengthMinutes]
            );
            const raceEventId = rows[0].id;

            for (const timeslot of event.timeslots) {
                await pool.query(
                    `INSERT INTO race_event_timeslots (race_event_id, start_at)
                    VALUES ($1, $2)
                    ON CONFLICT (race_event_id, start_at) DO NOTHING`,
                    [raceEventId, timeslot]
                );
            }
        }
    }
}

const SCHEDULE_REFRESH_MS = 6 * 60 * 60 * 1000; // every 6 hours

async function refreshSchedule() {
    try {
        const results = await fetchScheduleEvents();
        await saveScheduleEvents(results);
        console.log(`Schedule refreshed: ${results.length} series`);
    } catch (err) {
        console.error('Failed to refresh schedule:', err.message);
    }
}

refreshSchedule();
setInterval(refreshSchedule, SCHEDULE_REFRESH_MS);

app.get('/api/race-events', async (req, res) => {
    const { rows: series } = await pool.query("SELECT * FROM race_series WHERE source = 'schedule_pdf'");
    const { rows: events } = await pool.query('SELECT * FROM race_events ORDER BY race_series_id, week');
    const { rows: timeslots } = await pool.query('SELECT * FROM race_event_timeslots ORDER BY start_at');

    const result = series.map((s) => ({
        ...s,
        events: events
            .filter((e) => e.race_series_id === s.id)
            .map((e) => ({
                ...e,
                timeslots: timeslots
                    .filter((t) => t.race_event_id === e.id)
                    .map((t) => t.start_at),
            })),
    }));

    res.json(result);
});

// =======
// iRacing Special Events (scraped from iRacing HTML)
// =======

// Special events reuse race_series/race_events like the regular schedule,
// but each special event is its own one-off "series" with a single
// race_events row (week is fixed at 1) rather than a multi-week season.
async function saveSpecialEvents(results) {
    for (const event of results) {
        const { rows } = await pool.query(
            `INSERT INTO race_series (name, source, car_classes)
             VALUES ($1, 'special_event', $2)
             ON CONFLICT (source, name)
             DO UPDATE SET car_classes = EXCLUDED.car_classes
             RETURNING id`,
            [event.name, event.carClasses ?? null]
        );
        const raceSeriesId = rows[0].id;

        const { rows: eventRows } = await pool.query(
            `INSERT INTO race_events (name, race_series_id, week, length_minutes, distance_km, event_start_date, event_end_date)
             VALUES ($1, $2, 1, $3, $4, $5, $6)
             ON CONFLICT (race_series_id, week)
             DO UPDATE SET length_minutes = EXCLUDED.length_minutes, distance_km = EXCLUDED.distance_km,
                event_start_date = EXCLUDED.event_start_date, event_end_date = EXCLUDED.event_end_date
             RETURNING id`,
            [event.name, raceSeriesId, event.lengthMinutes, event.distanceKm, event.dateRange?.start ?? null, event.dateRange?.end ?? null]
        );
        const raceEventId = eventRows[0].id;

        for (const timeslot of event.timeslots) {
            await pool.query(
                `INSERT INTO race_event_timeslots (race_event_id, start_at)
                VALUES ($1, $2)
                ON CONFLICT (race_event_id, start_at) DO NOTHING`,
                [raceEventId, timeslot]
            );
        }
    }
}

async function refreshSpecialEvents() {
    try {
        const results = await fetchSpecialEvents();
        await saveSpecialEvents(results);
        console.log(`Special events refreshed: ${results.length} events`);
    } catch (err) {
        console.error('Failed to refresh special events:', err.message);
    }
}

const SPECIAL_EVENTS_REFRESH_MS = 60 * 60 * 1000; // every hour

refreshSpecialEvents();
setInterval(refreshSpecialEvents, SPECIAL_EVENTS_REFRESH_MS);

app.get('/api/special-events', async (req, res) => {
    const { rows: events } = await pool.query(
        `SELECT re.id, rs.name, rs.car_classes, re.length_minutes, re.distance_km,
                re.event_start_date, re.event_end_date
         FROM race_events re
         JOIN race_series rs ON rs.id = re.race_series_id
         WHERE rs.source = 'special_event'`
    );
    const { rows: timeslots } = await pool.query(
        `SELECT ret.race_event_id, ret.start_at
         FROM race_event_timeslots ret
         JOIN race_events re ON re.id = ret.race_event_id
         JOIN race_series rs ON rs.id = re.race_series_id
         WHERE rs.source = 'special_event'
         ORDER BY ret.start_at`
    );

    const result = events.map((e) => ({
        id: e.id,
        name: e.name,
        carClasses: e.car_classes,
        lengthMinutes: e.length_minutes,
        distanceKm: e.distance_km,
        dateRange: e.event_start_date ? { start: e.event_start_date, end: e.event_end_date } : null,
        timeslots: timeslots.filter((t) => t.race_event_id === e.id).map((t) => t.start_at),
    }));

    res.json(result);
});

// =======
// Race Event Signups (driver registration)
// =======

app.get('/api/race-events/:id/signups', async (req, res) => {
    const { rows } = await pool.query(
        `SELECT s.*, d.name AS driver_name, d.nickname AS driver_nickname
         FROM race_event_signups s
         LEFT JOIN murder_drivers d ON d.id = s.driver_id
         WHERE s.race_event_id = $1
         ORDER BY s.signed_up_at`,
        [req.params.id]
    );
    res.json(rows);
});

app.post('/api/race-events/:id/signups', async (req, res) => {
    const { driverId, guestName, guestIracingId, guestTimezone, carClass } = req.body;

    const { rows } = await pool.query(
        `INSERT INTO race_event_signups (race_event_id, driver_id, guest_name, guest_iracing_id, guest_timezone, car_class)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [req.params.id, driverId ?? null, guestName ?? null, guestIracingId ?? null, guestTimezone ?? null, carClass]
    );
    res.status(201).json(rows[0]);
});

app.patch('/api/race-event-signups/:id', async (req, res) => {
    const { carClass } = req.body;

    const { rows } = await pool.query(
        `UPDATE race_event_signups
         SET car_class = COALESCE($1, car_class)
         WHERE id = $2
         RETURNING *`,
        [carClass ?? null, req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Signup not found' });
    res.json(rows[0]);
});

app.delete('/api/race-event-signups/:id', async (req, res) => {
    await pool.query('DELETE FROM race_event_signups WHERE id = $1', [req.params.id]);
    res.status(204).end();
});