require('dotenv').config();
const express = require('express');
const { WebSocketServer } = require('ws');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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