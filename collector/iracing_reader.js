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
    constructor({ telemetryPollRateMs, telemetryFetchRateMs, sessionPollRateMs } = {}) {
        super();
        this._sdk = new IRacingSDK();
        this._telemetryPollRateMs = telemetryPollRateMs ?? Math.round(1000 / 60);
        // Heartbeat rate for telemetry, independent of the SDK's own
        // currDataVersion counter — gating solely on that counter meant a
        // stall there (e.g. during a rolling-start/formation-lap transition)
        // froze the whole telemetry stream even though the SDK was still
        // reachable and session data kept updating. This is a ceiling, not
        // the only trigger: flag changes below bypass it and emit
        // immediately, since those can be shorter-lived than this interval.
        this._telemetryFetchRateMs = telemetryFetchRateMs ?? 1000;
        this._sessionPollRateMs = sessionPollRateMs ?? 1000;

        this._polling = false;
        this._pollTimer = null;
        this._lastTelemetryFetchAt = 0;
        this._lastSessionFetchAt = 0;
        this._lastSessionOk = false;
        this._lastFlagsSignature = null;
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

        // sessionStatusOK is the live truth — startSDK() is only for
        // (re)attaching to the shared-memory segment when not currently
        // connected. Its own return value used to double as the "are we
        // connected" signal too, but that segment can apparently stay
        // attachable even after leaving a session (stale/leftover
        // mapping), which meant this never reliably flipped back to
        // disconnected. Always trust sessionStatusOK for the actual state.
        if (!this._sdk.sessionStatusOK) this._sdk.startSDK();
        const sessionOk = this._sdk.sessionStatusOK;
        if (sessionOk !== this._lastSessionOk) {
            this._lastSessionOk = sessionOk;
            this.emit(sessionOk ? 'connected' : 'disconnected');
        }

        if (sessionOk && this._sdk.waitForData(this._telemetryPollRateMs)) {
            const now = Date.now();
            const flat = flattenTelemetry(this._sdk.getTelemetry());

            // Flag state (a local yellow on a specific car, a caution being
            // thrown) can flip for less than a second — shorter than the
            // heartbeat below — so it's checked and emitted on every tick,
            // independent of the heartbeat timer, to make sure a brief flag
            // pulse between heartbeats can't be missed entirely.
            const flagsSignature = JSON.stringify([flat.SessionFlags, flat.CarIdxSessionFlags]);
            const flagsChanged = flagsSignature !== this._lastFlagsSignature;
            this._lastFlagsSignature = flagsSignature;

            if (flagsChanged || now - this._lastTelemetryFetchAt >= this._telemetryFetchRateMs) {
                this._lastTelemetryFetchAt = now;
                this.emit('telemetry', flat);
            }

            if (now - this._lastSessionFetchAt >= this._sessionPollRateMs) {
                this._lastSessionFetchAt = now;
                this.emit('session', this._sdk.getSessionData());
            }
        }

        this._pollTimer = setTimeout(() => this._tick(), this._telemetryPollRateMs);
    }
}

module.exports = { IracingReader };
