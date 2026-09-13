// Fuel usage model: laps-remaining estimate from the single most recently
// completed lap's fuel usage (lastFuelLevel - currentFuelLevel), no
// multi-lap averaging — reacts immediately to a genuine change in usage
// (fuel-saving, pace change) instead of smoothing it out.
class FuelCalculator {
    constructor() {
        this._lastLap = null;
        this._lapStartFuelLevel = null;
    }

    ingest({ Lap, FuelLevel }) {
        if (typeof Lap !== 'number' || typeof FuelLevel !== 'number') return null;

        if (this._lastLap === null) {
            this._lastLap = Lap;
            this._lapStartFuelLevel = FuelLevel;
            return null;
        }

        if (Lap === this._lastLap) return null;

        const used = this._lapStartFuelLevel - FuelLevel;
        this._lastLap = Lap;
        this._lapStartFuelLevel = FuelLevel;

        if (used <= 0) return null;

        return {
            lapsRemainingEst: Math.round((FuelLevel / used) * 10) / 10,
            source: 'telemetry',
        };
    }
}

module.exports = { FuelCalculator };