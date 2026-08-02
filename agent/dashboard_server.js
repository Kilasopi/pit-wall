// WebSocket broadcaster for the dashboard: pushes live stint/fuel/incident
// state in the { type, data } shape the dashboard already expects (see
// dashboard/src/hooks/useRelaySocket.js, which this mirrors).
const { WebSocketServer } = require('ws');

class DashboardServer {
    constructor({ dashboardPort }) {
        this._port = dashboardPort;
        this._wss = null;
    }

    start() {
        this._wss = new WebSocketServer({ port: this._port });
    }

    broadcast(type, data) {
        if (!this._wss) return;
        const message = JSON.stringify({ type, data });
        this._wss.clients.forEach((client) => {
            if (client.readyState === 1) client.send(message);
        });
    }

    stop() {
        if (this._wss) this._wss.close();
    }
}

module.exports = { DashboardServer };
