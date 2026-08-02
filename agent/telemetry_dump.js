// THROWAWAY — dumps raw session/telemetry payloads to disk so you can see
// what iRacing actually sends before deciding what to wire into the app.
// Delete this file and its call sites in index.js when done exploring.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'tmp-telemetry-dump');
const FILE = path.join(DIR, 'dump.jsonl');

fs.mkdirSync(DIR, { recursive: true });

function dump(type, payload) {
    const line = JSON.stringify({ t: new Date().toISOString(), type, payload });
    fs.appendFile(FILE, line + '\n', (err) => {
        if (err) console.error('telemetry_dump write failed:', err);
    });
}

module.exports = { dump };
