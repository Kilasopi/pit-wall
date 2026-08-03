// WebSocket broadcaster for the dashboard: pushes live stint/fuel/incident
// state in a { type, team, data } shape (see dashboard/src/hooks/
// useAgentSocket.js). One shared socket carries every team's data —
// dashboard clients filter by team client-side — since a single connected
// browser might reasonably watch more than one team's state.
const { WebSocketServer } = require('ws');

class DashboardServer {
    constructor({ dashboardPort }) {
        this._port = dashboardPort;
        this._wss = null;
    }

    start() {
        this._wss = new WebSocketServer({ port: this._port });
    }

    // team is null for connection-status events that aren't team-specific.
    broadcast(type, data, team = null) {
        if (!this._wss) return;
        const message = JSON.stringify({ type, team, data });
        this._wss.clients.forEach((client) => {
            if (client.readyState === 1) client.send(message);
        });
    }

    stop() {
        if (this._wss) this._wss.close();
    }
}

module.exports = { DashboardServer };
