// Fuel usage model: rolling laps-per-tank average from live FuelLevel/Lap
// telemetry, producing a live laps-remaining estimate with no manual gauge
// entry required.
const ROLLING_WINDOW = 5;

class FuelCalculator {
    constructor() {
        this._lastLap = null;
        this._lastFuelLevel = null;
        this._recentUsage = [];
    }

    // Feed one telemetry tick. Returns { lapsRemainingEst, source } when a
    // new estimate is available (a lap just completed), otherwise null.
    ingest({ Lap, FuelLevel }) {
        if (typeof Lap !== 'number' || typeof FuelLevel !== 'number') return null;

        if (this._lastLap === null) {
            this._lastLap = Lap;
            this._lastFuelLevel = FuelLevel;
            return null;
        }

        if (Lap === this._lastLap) {
            this._lastFuelLevel = FuelLevel;
            return null;
        }

        const used = this._lastFuelLevel - FuelLevel;
        this._lastLap = Lap;
        this._lastFuelLevel = FuelLevel;

        // A non-positive delta means the car refueled (or telemetry noise) —
        // don't let a pit stop poison the rolling average.
        if (used > 0) {
            this._recentUsage.push(used);
            if (this._recentUsage.length > ROLLING_WINDOW) this._recentUsage.shift();
        }

        if (this._recentUsage.length === 0) return null;

        const avgUsagePerLap =
            this._recentUsage.reduce((sum, v) => sum + v, 0) / this._recentUsage.length;
        if (avgUsagePerLap <= 0) return null;

        return {
            lapsRemainingEst: Math.round((FuelLevel / avgUsagePerLap) * 10) / 10,
            source: 'telemetry',
        };
    }
}

module.exports = { FuelCalculator };
