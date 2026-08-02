// WebSocket server that accepts collector connection(s) from the Sim PC
// and emits parsed telemetry/session events for downstream consumers
// (fuel_calculator, strategy_engine, storage, dashboard broadcast).
const { EventEmitter } = require('events');
const { WebSocketServer } = require('ws');
const { createMessage, parseMessage, MESSAGE_TYPES } = require('../shared/telemetry_schema');

class AgentWebSocketServer extends EventEmitter {
    constructor({ port }) {
        super();
        this._port = port;
        this._wss = null;
    }

    start() {
        this._wss = new WebSocketServer({ port: this._port });

        this._wss.on('connection', (ws) => {
            this.emit('collector-connected');

            ws.on('message', (raw) => {
                let message;
                try {
                    message = parseMessage(raw);
                } catch (err) {
                    return;
                }

                if (message.type === MESSAGE_TYPES.TELEMETRY) {
                    this.emit('telemetry', message.payload);
                } else if (message.type === MESSAGE_TYPES.SESSION) {
                    this.emit('session', message.payload);
                }
            });

            ws.on('close', () => {
                this.emit('collector-disconnected');
            });
        });
    }

    // Sends a command back to all connected collectors.
    sendCommand(payload) {
        if (!this._wss) return;
        const message = JSON.stringify(createMessage(MESSAGE_TYPES.COMMAND, payload));
        this._wss.clients.forEach((client) => {
            if (client.readyState === 1) client.send(message);
        });
    }

    stop() {
        if (this._wss) this._wss.close();
    }
}

module.exports = { AgentWebSocketServer };
