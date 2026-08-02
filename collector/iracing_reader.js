// Reads live telemetry from the iRacing SDK shared memory via irsdk-node.
// Windows + a running iRacing session only; requires irsdk-node's native
// addon (@irsdk-node/native), which is why this only runs on the Sim PC.
const { EventEmitter } = require('events');
const { IRacingSDK } = require('irsdk-node');

// irsdk-node returns each variable as { name, value: [...], unit, ... }
// rather than a plain value — unwrap once here so everything downstream
// (telemetry_sender, and ultimately the agent) just sees plain values.
function flattenTelemetry(raw) {
    const flat = {};
    for (const [key, meta] of Object.entries(raw ?? {})) {
        if (meta && Array.isArray(meta.value)) {
            flat[key] = meta.value.length === 1 ? meta.value[0] : meta.value;
        } else {
            flat[key] = meta;
        }
    }
    return flat;
}

class IracingReader extends EventEmitter {
    constructor({ telemetryPollRateMs, sessionPollRateMs } = {}) {
        super();
        this._sdk = new IRacingSDK();
        this._telemetryPollRateMs = telemetryPollRateMs ?? Math.round(1000 / 60);
        this._sessionPollRateMs = sessionPollRateMs ?? 1000;

        this._polling = false;
        this._pollTimer = null;
        this._lastDataVersion = -1;
        this._lastSessionFetchAt = 0;
        this._lastSessionOk = false;
    }

    start() {
        if (this._polling) return;
        this._polling = true;
        this._sdk.startSDK();
        this._tick();
    }

    stop() {
        this._polling = false;
        clearTimeout(this._pollTimer);
        this._sdk.stopSDK();
    }

    _tick() {
        if (!this._polling) return;

        const sessionOk = this._sdk.sessionStatusOK || this._sdk.startSDK();
        if (sessionOk !== this._lastSessionOk) {
            this._lastSessionOk = sessionOk;
            this.emit(sessionOk ? 'connected' : 'disconnected');
        }

        if (sessionOk && this._sdk.waitForData(this._telemetryPollRateMs)) {
            if (this._sdk.currDataVersion !== this._lastDataVersion) {
                this._lastDataVersion = this._sdk.currDataVersion;
                this.emit('telemetry', flattenTelemetry(this._sdk.getTelemetry()));
            }

            const now = Date.now();
            if (now - this._lastSessionFetchAt >= this._sessionPollRateMs) {
                this._lastSessionFetchAt = now;
                this.emit('session', this._sdk.getSessionData());
            }
        }

        this._pollTimer = setTimeout(() => this._tick(), this._telemetryPollRateMs);
    }
}

module.exports = { IracingReader };
