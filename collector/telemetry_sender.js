// WebSocket client that connects to the agent (Work PC) and streams
// telemetry out, reconnecting with backoff if the connection drops.
const { EventEmitter } = require('events');
const WebSocket = require('ws');
const { createMessage, MESSAGE_TYPES } = require('../shared/telemetry_schema');

class TelemetrySender extends EventEmitter {
    constructor(config) {
        super();
        this._config = config;
        this._ws = null;
        this._closedByUser = false;
        this._reconnectDelayMs = config.reconnect.initialDelayMs;
    }

    connect() {
        this._closedByUser = false;
        this._ws = new WebSocket(this._config.agentUrl);

        this._ws.on('open', () => {
            this._reconnectDelayMs = this._config.reconnect.initialDelayMs;
            this.emit('connected');
        });

        this._ws.on('message', (raw) => {
            this.emit('message', raw);
        });

        this._ws.on('close', () => {
            this.emit('disconnected');
            if (!this._closedByUser) this._scheduleReconnect();
        });

        this._ws.on('error', (err) => {
            this.emit('error', err);
        });
    }

    _scheduleReconnect() {
        setTimeout(() => this.connect(), this._reconnectDelayMs);
        this._reconnectDelayMs = Math.min(
            this._reconnectDelayMs * this._config.reconnect.backoffMultiplier,
            this._config.reconnect.maxDelayMs
        );
    }

    sendTelemetry(values) {
        this._send(createMessage(MESSAGE_TYPES.TELEMETRY, values));
    }

    sendSession(data) {
        this._send(createMessage(MESSAGE_TYPES.SESSION, data));
    }

    sendIracingStatus(connected) {
        this._send(createMessage(MESSAGE_TYPES.IRACING_STATUS, { connected }));
    }

    sendHello(teamOverride) {
        this._send(createMessage(MESSAGE_TYPES.HELLO, { teamOverride }));
    }

    _send(message) {
        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
            this._ws.send(JSON.stringify(message));
        }
    }

    close() {
        this._closedByUser = true;
        if (this._ws) this._ws.close();
    }
}

module.exports = { TelemetrySender };
