// WebSocket broadcaster for the dashboard: pushes live stint/fuel/incident
// state in a { type, team, data } shape (see dashboard/src/hooks/
// useAgentSocket.js). One shared socket carries every team's data —
// dashboard clients filter by team client-side — since a single connected
// browser might reasonably watch more than one team's state.
const { EventEmitter } = require('events');
const { WebSocketServer } = require('ws');

class DashboardServer extends EventEmitter {
    constructor({ dashboardPort }) {
        super();
        this._port = dashboardPort;
        this._wss = null;
    }

    // Emits 'connection' with the raw ws so callers can replay any
    // state that's only ever broadcast once at the moment it changes
    // (e.g. collector/iRacing session status) — a dashboard tab that
    // connects after that already happened would otherwise never learn
    // the current state until it changes again.
    start() {
        this._wss = new WebSocketServer({ port: this._port });
        this._wss.on('connection', (ws) => {
            this.emit('connection', ws);
            // Dashboard -> agent controls (e.g. "lock spectator view to car
            // X") — same { type, team, data } shape as outbound messages,
            // just travelling the other way on the same socket.
            ws.on('message', (raw) => {
                let msg;
                try {
                    msg = JSON.parse(raw);
                } catch {
                    return;
                }
                if (msg?.type) this.emit('message', msg, ws);
            });
        });
    }

    // team is null for connection-status events that aren't team-specific.
    broadcast(type, data, team = null) {
        if (!this._wss) return;
        const message = JSON.stringify({ type, team, data });
        this._wss.clients.forEach((client) => {
            if (client.readyState === 1) client.send(message);
        });
    }

    sendTo(ws, type, data, team = null) {
        if (ws.readyState === 1) ws.send(JSON.stringify({ type, team, data }));
    }

    stop() {
        if (this._wss) this._wss.close();
    }
}

module.exports = { DashboardServer };
