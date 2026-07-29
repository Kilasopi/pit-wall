require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const { WebSocketServer } = require('ws');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.get('/api/murder-drivers', async (req, res) => {
    const { rows } = await pool.query(
        'SELECT id, name, nickname, iracing_id, active, timezone FROM murder_drivers ORDER BY name'
    );
    res.json(rows);
});

app.get('/api/entry-drivers', async (req, res) => {
    const { rows } = await pool.query(`
        SELECT ed.id,
               COALESCE(md.name, ed.guest_name) AS driver_name,
               ed.driver_id IS NULL AS is_guest,
               ed.event_name,
               ed.entry_name,
               ed.car_number
        FROM entry_drivers ed
        LEFT JOIN murder_drivers md ON md.id = ed.driver_id
        ORDER BY ed.event_name, ed.entry_name, driver_name
    `);
    res.json(rows);
});

const server = app.listen(process.env.PORT || 4000, () =>
    console.log(`Relay listening on ${server.address().port}`)
);

const wss = new WebSocketServer({ server });
let latestState = null;

wss.on('connection', (ws) => {
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
    const { driverId, guestName, eventName, entryName, carNumber } = req.body;

    const { rows } = await pool.query(
        `INSERT INTO entry_drivers (driver_id, guest_name, event_name, entry_name, car_number)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [driverId ?? null, guestName ?? null, eventName, entryName, carNumber ?? null]
    )
    res.status(201).json(rows[0]);
});

app.delete('/api/entry-drivers', async (req, res) => {
    await pool.query('DELETE FROM entry_drivers');
    res.status(204).end();
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
    const { name, nickname, iracingId, timezone, active } = req.body;

    const { rows } = await pool.query(
        `UPDATE murder_drivers
        SET name = $1, nickname = $2, iracing_id = $3, timezone = $4, active = $5
        WHERE id = $6
        RETURNING *`,
        [name, nickname ?? null, iracingId ?? null, timezone ?? null, active, req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Driver not found' });
    res.json(rows[0]);
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
// Special events (scraped from iracing.com, cached for an hour)
// =======

const SPECIAL_EVENTS_URL = 'https://www.iracing.com/special-events/';
const SPECIAL_EVENTS_CACHE_MS = 60 * 60 * 1000;
let specialEventsCache = { fetchedAt: 0, events: [] };

async function fetchSpecialEvents() {
    const res = await fetch(SPECIAL_EVENTS_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const html = await res.text();

    // The page lists upcoming events first, then a "Completed Events" heading
    // followed by past events. Truncate there so only upcoming events remain,
    // and keep document order since the page already lists them chronologically.
    const completedIdx = html.indexOf('id="completed-events"');
    const upcomingHtml = completedIdx === -1 ? html : html.slice(0, completedIdx);

    const $ = cheerio.load(upcomingHtml);
    const names = [];
    const seen = new Set();
    $('section.wp-block-cover[id]').each((_, section) => {
        const name = $(section).find('h2.wp-block-heading').first().text().trim();
        if (name && !seen.has(name)) {
            seen.add(name);
            names.push(name);
        }
    });
    return names;
}

app.get('/api/special-events', async (req, res) => {
    const isStale = Date.now() - specialEventsCache.fetchedAt > SPECIAL_EVENTS_CACHE_MS;

    if (isStale) {
        try {
            specialEventsCache = { fetchedAt: Date.now(), events: await fetchSpecialEvents() };
        } catch (err) {
            // serve stale cache (or empty list) rather than fail the request
            console.error('Failed to refresh special events:', err.message);
        }
    }

    res.json(specialEventsCache.events);
});