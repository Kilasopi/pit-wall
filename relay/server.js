require('dotenv').config({ path: __dirname + '/../.env' });
const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const { WebSocketServer } = require('ws');
const { Pool } = require('pg');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const { rows: users } = await pool.query(
            `SELECT id, username, password_hash
            FROM users
            WHERE username = $1`,
            [username]
        );
        if (!users[0] || users[0].password_hash == null) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const valid = await bcrypt.compare(password, users[0].password_hash);

        if (!valid) return res.status(401).json({ error: 'Invalid username or password' });

        const token = jwt.sign({ userId: users[0].id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user: { id: users[0].id, username: users[0].username } });
    } catch (err) {
        console.error('Failed to log in:', err.message);
        res.status(500).json({ error: 'Failed to log in' });
    }
})

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const passwordHash = await bcrypt.hash(password, 10);

        const { rows } = await pool.query(
            `INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username`,
            [username, passwordHash]
        );

        const token = jwt.sign({ userId: rows[0].id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.status(201).json({ token, user: rows[0] });
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Username already taken' });
        console.error('Failed to register:', err.message);
        res.status(500).json({ error: 'Failed to register' });
    }
});

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.slice(7); // strip "Bearer " off the front

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = payload.userId;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

app.get('/api/murder-drivers', async (req, res) => {
    const { rows } = await pool.query(
        'SELECT id, name, nickname, iracing_id, active, timezone FROM murder_drivers ORDER BY name'
    );
    res.json(rows);
});

app.get('/api/murder-drivers/unclaimed', async (req, res) => {
    const { rows } = await pool.query(
        `SELECT id, name FROM murder_drivers
         WHERE id NOT IN (SELECT driver_id FROM users WHERE driver_id IS NOT NULL)
         ORDER BY name`
    );
    res.json(rows);
});

app.post('/api/users/me/claim-driver', requireAuth, async (req, res) => {
    try {
        const { driverId } = req.body;

        const { rows } = await pool.query(
            `UPDATE users SET driver_id = $1 WHERE id = $2 AND driver_id IS NULL RETURNING id, username, driver_id`,
            [driverId, req.userId]
        );

        if (!rows[0]) return res.status(409).json({ error: 'You already have a claimed profile' });
        res.json(rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'That driver is already claimed' });
        console.error('Failed to claim driver:', err.message);
        res.status(500).json({ error: 'Failed to claim driver' });
    }
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

const wss = new WebSocketServer({ server, path: '/ws-relay' });
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
    const { driverId, guestName, eventName, entryName, carNumber, carType, stintMinutes, teamId } = req.body;

    const { rows } = await pool.query(
        `INSERT INTO entry_drivers (driver_id, guest_name, event_name, entry_name, car_number, car_type, stint_minutes, team_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [driverId ?? null, guestName ?? null, eventName, entryName, carNumber ?? null, carType ?? null, stintMinutes ?? null, teamId ?? null]
    )
    res.status(201).json(rows[0]);
});

app.delete('/api/entry-drivers', async (req, res) => {
    await pool.query('DELETE FROM entry_drivers');
    res.status(204).end();
});

// Wipes stint/fuel/incident history once it's no longer needed (e.g. after
// a test session) instead of letting it sit around and get mistaken for
// current data. fuel_readings first since it FKs to stints.
app.delete('/api/session-history', async (req, res) => {
    await pool.query('DELETE FROM fuel_readings');
    await pool.query('DELETE FROM stints');
    await pool.query('DELETE FROM incidents');
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
    const { name, nickname, iracingId, timezone } = req.body;

    const { rows } = await pool.query(
        `INSERT INTO murder_drivers (name, nickname, iracing_id, timezone)
        VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [name, nickname ?? null, iracingId ?? null, timezone ?? null]
    )
    res.status(201).json(rows[0]);
});

app.patch('/api/murder-drivers/:id', async (req, res) => {
    try {
        const {
            name,
            nickname,
            iracingId,
            timezone,
            active,
        } = req.body;

        const { rows } = await pool.query(
            `UPDATE murder_drivers
             SET name = $1,
                 nickname = $2,
                 iracing_id = $3,
                 timezone = $4,
                 active = $5
             WHERE id = $6
             RETURNING *`,
            [
                name,
                nickname ?? null,
                iracingId ?? null,
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
            `INSERT INTO race_events (name, track, race_series_id, week, length_minutes, distance_km, event_start_date, event_end_date)
            VALUES ($1, $2, $3, 1, $4, $5, $6, $7)
            ON CONFLICT (race_series_id, week)
            DO UPDATE SET track = EXCLUDED.track, length_minutes = EXCLUDED.length_minutes, distance_km = EXCLUDED.distance_km,
                event_start_date = EXCLUDED.event_start_date, event_end_date = EXCLUDED.event_end_date
            RETURNING id`,
            [event.name, event.track, raceSeriesId, event.lengthMinutes, event.distanceKm, event.dateRange?.start ?? null, event.dateRange?.end ?? null]
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

    // Events that dropped out of the current scrape (filtered out, or
    // genuinely removed from the listing page) shouldn't linger in the DB.
    // Guarded against an empty result set so a failed/partial scrape can't
    // wipe every special event.
    if (results.length > 0) {
        const currentNames = results.map((e) => e.name);
        await pool.query(
            `DELETE FROM race_series WHERE source = 'special_event' AND name != ALL($1::text[])`,
            [currentNames]
        );
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

// Once a race has actually finished (last timeslot start + race length has
// passed), the team/car/timeslot-voting setup for it is done being useful —
// clear the team assignments so the planner doesn't keep showing stale
// rosters for events that already happened. Signups themselves are left
// alone since they're the historical "who registered" record.
async function cleanupFinishedTeams() {
    try {
        const { rows } = await pool.query(`
            SELECT re.id
            FROM race_events re
            JOIN race_event_timeslots ts ON ts.race_event_id = re.id
            WHERE EXISTS (SELECT 1 FROM race_event_teams t WHERE t.race_event_id = re.id)
            GROUP BY re.id, re.length_minutes
            HAVING MAX(ts.start_at) + (COALESCE(re.length_minutes, 0) * INTERVAL '1 minute') < now()
        `);

        if (rows.length === 0) return;

        const eventIds = rows.map((r) => r.id);
        await pool.query(`DELETE FROM race_event_teams WHERE race_event_id = ANY($1::int[])`, [eventIds]);
        console.log(`Cleared team assignments for ${eventIds.length} finished event(s)`);
    } catch (err) {
        console.error('Failed to clean up finished event teams:', err.message);
    }
}

const TEAM_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // every hour

cleanupFinishedTeams();
setInterval(cleanupFinishedTeams, TEAM_CLEANUP_INTERVAL_MS);

app.get('/api/special-events', async (req, res) => {
    const { rows: events } = await pool.query(
        `SELECT re.id, rs.name, rs.car_classes, re.track, re.length_minutes, re.distance_km,
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
        track: e.track,
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
        `SELECT s.*, d.name AS driver_name, d.nickname AS driver_nickname, d.timezone AS driver_timezone
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
    // race_event_id + car_class are needed after the delete to scope the
    // team sweep, so grab them before the row is gone.
    const { rows: signupRows } = await pool.query(
        'SELECT race_event_id, car_class FROM race_event_signups WHERE id = $1',
        [req.params.id]
    );
    const raceEventId = signupRows[0]?.race_event_id;
    const carClass = signupRows[0]?.car_class;

    await pool.query('DELETE FROM race_event_signups WHERE id = $1', [req.params.id]);

    // Only teams in the same car class as the removed signup are swept —
    // an empty GTP team shouldn't get deleted just because an unrelated
    // LMP2 signup was removed.
    if (raceEventId && carClass) {
        await pool.query(
            `DELETE FROM race_event_teams t
             WHERE t.race_event_id = $1
               AND t.car_class = $2
               AND NOT EXISTS (
                   SELECT 1 FROM race_event_team_members m WHERE m.team_id = t.id
               )`,
            [raceEventId, carClass]
        );
    }

    res.status(204).end();
});

app.get('/api/race-events/:id/teams', async (req, res) => {
    const [teamRows, unassignedRows, timeslotRows, voteRows, carVoteRows] = await Promise.all([
        pool.query(
            `SELECT
                t.id AS team_id, t.name AS team_name, t.car_class,
                t.locked_timeslot_id, t.locked_car_name,
                s.id AS signup_id, s.driver_id, s.guest_name, s.guest_iracing_id, s.guest_timezone,
                d.name AS driver_name, d.nickname AS driver_nickname, d.iracing_id, d.timezone AS driver_timezone
            FROM race_event_teams t
            LEFT JOIN race_event_team_members m ON m.team_id = t.id
            LEFT JOIN race_event_signups s ON s.id = m.signup_id
            LEFT JOIN murder_drivers d ON d.id = s.driver_id
            WHERE t.race_event_id = $1
            ORDER BY t.id`,
            [req.params.id]
        ),
        pool.query(
            // A driver counts as "assigned" the moment ANY of their signups for
            // this event is on a team — not just the specific signup being
            // checked — so joining a team in one class removes them from every
            // other class's unassigned pool too. Guests have no driver_id, so
            // they're only matched against their own exact signup.
            `SELECT s.id AS signup_id, s.car_class, s.driver_id, s.guest_name, s.guest_iracing_id,
                    d.name AS driver_name, d.nickname AS driver_nickname, d.iracing_id
             FROM race_event_signups s
             LEFT JOIN murder_drivers d ON d.id = s.driver_id
             WHERE s.race_event_id = $1
               AND NOT EXISTS (
                   SELECT 1
                   FROM race_event_team_members m
                   JOIN race_event_signups s2 ON s2.id = m.signup_id
                   WHERE s2.race_event_id = s.race_event_id
                     AND (
                         (s.driver_id IS NOT NULL AND s2.driver_id = s.driver_id)
                         OR (s.driver_id IS NULL AND s2.id = s.id)
                     )
               )`,
            [req.params.id]
        ),
        pool.query(
            'SELECT id, start_at FROM race_event_timeslots WHERE race_event_id = $1 ORDER BY start_at',
            [req.params.id]
        ),
        pool.query(
            `SELECT v.timeslot_id, v.team_id, v.signup_id
             FROM race_event_timeslot_votes v
             JOIN race_event_timeslots ts ON ts.id = v.timeslot_id
             WHERE ts.race_event_id = $1`,
            [req.params.id]
        ),
        pool.query(
            `SELECT cv.team_id, cv.signup_id, cv.car_name
             FROM race_event_car_votes cv
             JOIN race_event_teams t ON t.id = cv.team_id
             WHERE t.race_event_id = $1`,
            [req.params.id]
        ),
    ]);

    const teams = [];
    const byId = new Map();
    for (const row of teamRows.rows) {
        if (!byId.has(row.team_id)) {
            const team = {
                id: row.team_id,
                name: row.team_name,
                car_class: row.car_class,
                locked_timeslot_id: row.locked_timeslot_id,
                locked_car_name: row.locked_car_name,
                members: [],
            };
            byId.set(row.team_id, team);
            teams.push(team);
        }
        if (row.signup_id) {
            byId.get(row.team_id).members.push({
                signup_id: row.signup_id,
                driver_id: row.driver_id,
                name: row.driver_name ?? row.guest_name,
                nickname: row.driver_nickname,
                iracing_id: row.iracing_id ?? row.guest_iracing_id,
                timezone: row.driver_timezone ?? row.guest_timezone,
            });
        }
    }

    const votesByTeam = {};
    for (const v of voteRows.rows) {
        (votesByTeam[v.team_id] ??= {});
        (votesByTeam[v.team_id][v.timeslot_id] ??= []).push(v.signup_id);
    }

    const carVotesByTeam = {};
    for (const v of carVoteRows.rows) {
        (carVotesByTeam[v.team_id] ??= []).push({ signup_id: v.signup_id, car_name: v.car_name });
    }

    for (const team of teams) {
        team.votes = votesByTeam[team.id] ?? {};
        team.carVotes = carVotesByTeam[team.id] ?? [];
    }

    res.json({ teams, unassigned: unassignedRows.rows, timeslots: timeslotRows.rows });
});

app.get('/api/race-events/:id/car-classes', async (req, res) => {
    const { rows } = await pool.query(
        `SELECT rs.car_classes
         FROM race_events re
         JOIN race_series rs ON rs.id = re.race_series_id
         WHERE re.id = $1`,
        [req.params.id]
    );
    res.json({ carClasses: rows[0]?.car_classes ?? [] });
});

app.post('/api/race-events/:id/teams', async (req, res) => {
    const { carClass, name } = req.body;

    const { rows } = await pool.query(
        `INSERT INTO race_event_teams (race_event_id, car_class, name)
        VALUES ($1, $2, $3)
        RETURNING *`,
        [req.params.id, carClass, name]
    );

    res.status(201).json(rows[0]);
});

app.post('/api/teams/:teamId/join', async (req, res) => {
    try {
        const { signupId } = req.body;

        const { rows: signupRows } = await pool.query(
            'SELECT race_event_id, driver_id FROM race_event_signups WHERE id = $1',
            [signupId]
        );
        const signup = signupRows[0];
        if (!signup) return res.status(404).json({ error: 'Signup not found' });

        // Same driver-level check as the unassigned query: block joining a
        // second team if this driver already has a team via any of their
        // other signups for this event.
        const { rows: conflictRows } = await pool.query(
            `SELECT m.id
             FROM race_event_team_members m
             JOIN race_event_signups s ON s.id = m.signup_id
             WHERE s.race_event_id = $1
               AND (
                   ($2::int IS NOT NULL AND s.driver_id = $2)
                   OR ($2::int IS NULL AND m.signup_id = $3)
               )`,
            [signup.race_event_id, signup.driver_id, signupId]
        );
        if (conflictRows.length > 0) {
            return res.status(409).json({ error: 'Driver already on a team for this event' });
        }

        const { rows } = await pool.query(
            `INSERT INTO race_event_team_members (team_id, signup_id)
            VALUES ($1, $2)
            RETURNING *`,
            [req.params.teamId, signupId]
        );
        console.log('Driver added to team');
        res.status(201).json(rows[0]);
    } catch(err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Signup already on a team' });
        }
        console.error('Failed to add driver to team:', err.message);
        res.status(500).json({ error: 'Failed to add driver to team' });
    }
});

app.delete('/api/teams/:teamId', async (req, res) => {
    await pool.query('DELETE FROM race_event_teams WHERE id = $1', [req.params.teamId]);
    res.status(204).end();
});

app.delete('/api/team-members/:signupId', async (req, res) => {
    await pool.query('DELETE FROM race_event_team_members WHERE signup_id = $1', [req.params.signupId]);
    res.status(204).end();
})

app.post('/api/timeslots/:timeslotId/vote', requireAuth, async (req, res) => {
    try {
        const { signupId } = req.body;

        const { rows: memberRows } = await pool.query(
            `SELECT team_id FROM race_event_team_members WHERE signup_id = $1`, 
            [signupId]
        );

        const teamId = memberRows[0]?.team_id;
        if (!teamId) return res.status(404).json({ error: 'Signup is not on a team' });

        const { rows } = await pool.query(
            `INSERT INTO race_event_timeslot_votes (timeslot_id, team_id, signup_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (timeslot_id, signup_id) DO NOTHING
            RETURNING *`,
            [req.params.timeslotId, teamId, signupId]
        );
        res.status(201).json(rows[0] ?? 
            { timeslot_id: Number(req.params.timeslotId), team_id: teamId, signup_id: signupId }
        );

    } catch(err) {
        console.error('Failed to record timeslot vote:', err.message);
        res.status(500).json({ error: 'Failed to record timeslot vote' });
    }
});

app.delete('/api/timeslots/:timeslotId/vote/:signupId', requireAuth, async (req, res) => {
    await pool.query(
        `DELETE FROM race_event_timeslot_votes WHERE timeslot_id = $1 AND signup_id = $2`,
        [req.params.timeslotId, req.params.signupId]
    );
    res.status(204).end();
});

app.post('/api/teams/:teamId/car-votes', requireAuth, async (req, res) => {
    try {
        const { signupId, carName } = req.body;

        const { rows } = await pool.query(
            `INSERT INTO race_event_car_votes (team_id, signup_id, car_name)
            VALUES ($1, $2, $3)
            ON CONFLICT (team_id, signup_id, car_name) DO UPDATE SET voted_at = now()
            RETURNING *`,
            [req.params.teamId, signupId, carName]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Failed to record car vote:', err.message);
        res.status(500).json({ error: 'Failed to record car vote' });
    }
});

app.delete('/api/teams/:teamId/car-votes/:signupId/:carName', requireAuth, async (req, res) => {
    await pool.query(
        `DELETE FROM race_event_car_votes WHERE team_id = $1 AND signup_id = $2 AND car_name = $3`,
        [req.params.teamId, req.params.signupId, req.params.carName]
    );
    res.status(204).end();
});

app.post('/api/teams/:teamId/lock-car', requireAuth, async (req, res) => {
    try {
        const { carName } = req.body;
        const { rows } = await pool.query(
            `UPDATE race_event_teams SET locked_car_name = $1 WHERE id = $2 RETURNING *`,
            [carName, req.params.teamId]
        );
        res.json(rows[0]);
    } catch (err) {
        console.error('Failed to lock car:', err.message);
        res.status(500).json({ error: 'Failed to lock car' });
    }
});

app.post('/api/teams/:teamId/lock-timeslot', requireAuth, async (req, res) => {
    try {
        const { timeslotId } = req.body;
        const { teamId } = req.params;

        const { rows } = await pool.query(
            `UPDATE race_event_teams t
             SET locked_timeslot_id = $1,
                 race_start_at = ts.start_at,
                 race_length_minutes = re.length_minutes
             FROM race_event_timeslots ts, race_events re
             WHERE t.id = $2
               AND ts.id = $1
               AND re.id = t.race_event_id
             RETURNING t.*`,
            [timeslotId, teamId]
        );

        if (!rows[0]) return res.status(404).json({ error: 'Team or timeslot not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Failed to lock timeslot:', err.message);
        res.status(500).json({ error: 'Failed to lock timeslot' });
    }
});

app.delete('/api/teams/:teamId/lock-car', requireAuth, async (req, res) => {
    await pool.query(
        `UPDATE race_event_teams SET locked_car_name = NULL WHERE id = $1`,
        [req.params.teamId]
    );
    res.status(204).end();
});

app.delete('/api/teams/:teamId/lock-timeslot', requireAuth, async (req, res) => {
    await pool.query(
        `UPDATE race_event_teams
         SET locked_timeslot_id = NULL,
             race_start_at = NULL,
             race_length_minutes = NULL
         WHERE id = $1`,
        [req.params.teamId]
    );
    res.status(204).end();
});

app.get('/api/teams/:teamId/entry-drivers', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT ed.id, ed.team_id, ed.driver_id, ed.guest_name,
                    COALESCE(md.name, ed.guest_name) AS driver_name,
                    ed.driver_id IS NULL AS is_guest,
                    md.timezone,
                    ed.event_name, ed.entry_name, ed.car_number, ed.car_type,
                    ed.stint_order, ed.stint_minutes
             FROM entry_drivers ed
             LEFT JOIN murder_drivers md ON md.id = ed.driver_id
             WHERE ed.team_id = $1
             ORDER BY ed.stint_order NULLS LAST`,
            [req.params.teamId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Failed to load entry drivers for team:', err.message);
        res.status(500).json({ error: 'Failed to load entry drivers' });
    }
});

app.get('/api/teams/:teamId/roster', requireAuth, async (req, res) => {
    const { rows } = await pool.query(
        `SELECT s.id AS signup_id, s.driver_id, s.guest_name,
                COALESCE(md.name, s.guest_name) AS driver_name,
                s.driver_id IS NULL AS is_guest,
                md.timezone
         FROM race_event_team_members m
         JOIN race_event_signups s ON s.id = m.signup_id
         LEFT JOIN murder_drivers md ON md.id = s.driver_id
         WHERE m.team_id = $1
         ORDER BY driver_name`,
        [req.params.teamId]
    );
    res.json(rows);
});

app.get('/api/teams/:teamId', requireAuth, async (req, res) => {
    const { rows } = await pool.query(
        `SELECT t.id, t.name, t.car_class, t.race_start_at, t.race_length_minutes,
                t.practice_minutes, t.quali_minutes, t.locked_car_name, t.locked_timeslot_id,
                t.quali_signup_id,
                COALESCE(md.name, s.guest_name) AS quali_driver_name
         FROM race_event_teams t
         LEFT JOIN race_event_signups s ON s.id = t.quali_signup_id
         LEFT JOIN murder_drivers md ON md.id = s.driver_id
         WHERE t.id = $1`,
        [req.params.teamId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Team not found' });
    res.json(rows[0]);
});

app.patch('/api/teams/:teamId/race-settings', requireAuth, async (req, res) => {
    const { raceStartAt, raceLengthMinutes, practiceMinutes, qualiMinutes, qualiSignupId } = req.body;
    const { rows } = await pool.query(
        `UPDATE race_event_teams
         SET race_start_at = COALESCE($1, race_start_at),
             race_length_minutes = COALESCE($2, race_length_minutes),
             practice_minutes = COALESCE($3, practice_minutes),
             quali_minutes = COALESCE($4, quali_minutes),
             quali_signup_id = COALESCE($5, quali_signup_id)
         WHERE id = $6
         RETURNING *`,
        [raceStartAt ?? null, raceLengthMinutes ?? null, practiceMinutes ?? null, qualiMinutes ?? null, qualiSignupId ?? null, req.params.teamId]
    );
    res.json(rows[0]);
});

app.get('/api/registered-races', async (req,res) => {
    const { rows } = await pool.query(`
        SELECT
            re.id AS race_event_id,
            re.name AS event_name,
            re.track,
            re.week,
            re.length_minutes,
            re.distance_km,
            re.event_start_date,
            re.event_end_date,
            rs.id AS race_series_id,
            rs.name AS series_name,
            rs.source,
            s.car_class,
            COUNT(s.id)::int AS signup_count
        FROM race_event_signups s
        JOIN race_events re
            ON re.id = s.race_event_id
        JOIN race_series rs
            ON rs.id = re.race_series_id
        GROUP BY
            re.id,
            re.name,
            re.track,
            re.week,
            re.length_minutes,
            re.event_start_date,
            re.event_end_date,
            rs.id,
            rs.name,
            rs.source,
            s.car_class
        ORDER BY
            re.event_start_date NULLS LAST,
            re.id,
            s.car_class
    `);

    res.json(rows);
});
