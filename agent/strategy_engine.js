// Driver-swap and team-incident detection from telemetry + session info,
// so neither has to be logged by hand mid-race.
//
// - Swaps: two independent triggers, since DCDriversSoFar alone only
//   covers driving your own car. DCDriversSoFar (iRacing's own "drivers
//   who've run a stint so far" counter) incrementing means a new driver
//   took your seat. CamCarIdx changing means you pointed the spectator
//   camera at a different car — needed to pick up whoever you're
//   watching, since that never moves DCDriversSoFar at all.
// - Incidents: PlayerCarTeamIncidentCount is the whole team's incident
//   total for the session; a positive delta *is* the points value for
//   that incident (1x/2x/4x). A 0x/warning-only incident doesn't move
//   this counter, so it can't be detected this way.
class StrategyEngine {
    constructor() {
        this._sessionInfo = null;
        this._lastDCDriversSoFar = null;
        this._lastCamCarIdx = null;
        this._lastTeamIncidentCount = null;
        this._lastLap = null;
        this._lapAtStintStart = null;
        this._currentDriver = null;
        this._currentCarNumber = null;
        this._currentCarName = null;
    }

    ingestSession(sessionInfo) {
        this._sessionInfo = sessionInfo;
    }

    // Returns an array of events for this telemetry tick, any of:
    //   { type: 'swap', driver, carNumber, carName, lap }
    //   { type: 'lap', lapsCompletedThisStint }
    //   { type: 'incident', points, lap }
    ingestTelemetry(values) {
        const events = [];
        const lap = typeof values.Lap === 'number' ? values.Lap : null;

        const isFirstTick = this._lastDCDriversSoFar === null && this._lastCamCarIdx === null;

        const dcDriversChanged =
            !isFirstTick &&
            typeof values.DCDriversSoFar === 'number' &&
            this._lastDCDriversSoFar !== null &&
            values.DCDriversSoFar > this._lastDCDriversSoFar;

        const camCarChanged =
            !isFirstTick &&
            typeof values.CamCarIdx === 'number' &&
            this._lastCamCarIdx !== null &&
            values.CamCarIdx !== this._lastCamCarIdx;

        if (typeof values.DCDriversSoFar === 'number') this._lastDCDriversSoFar = values.DCDriversSoFar;
        if (typeof values.CamCarIdx === 'number') this._lastCamCarIdx = values.CamCarIdx;

        if (isFirstTick || dcDriversChanged || camCarChanged) {
            const { driver, carNumber, carName } = this._resolveCurrentDriver(values);
            this._currentDriver = driver;
            this._currentCarNumber = carNumber;
            this._currentCarName = carName;
            this._lapAtStintStart = lap ?? 0;
            events.push({ type: 'swap', driver, carNumber, carName, lap });
        }

        if (lap !== null && lap !== this._lastLap) {
            this._lastLap = lap;
            events.push({
                type: 'lap',
                lapsCompletedThisStint: Math.max(0, lap - (this._lapAtStintStart ?? lap)),
            });
        }

        if (typeof values.PlayerCarTeamIncidentCount === 'number') {
            if (this._lastTeamIncidentCount !== null) {
                const delta = values.PlayerCarTeamIncidentCount - this._lastTeamIncidentCount;
                if (delta > 0) events.push({ type: 'incident', points: delta, lap });
            }
            this._lastTeamIncidentCount = values.PlayerCarTeamIncidentCount;
        }

        return events;
    }

    currentDriver() {
        return {
            driver: this._currentDriver,
            carNumber: this._currentCarNumber,
            carName: this._currentCarName,
        };
    }

    _resolveCurrentDriver(values) {
        // CamCarIdx (whichever car the camera is on), not PlayerCarIdx
        // (your own car slot as a session participant) — when spectating,
        // those differ, and PlayerCarIdx never follows the camera to an
        // AI car.
        const carIdx = values.CamCarIdx;
        const drivers = this._sessionInfo?.DriverInfo?.Drivers;
        const info =
            Array.isArray(drivers) && typeof carIdx === 'number'
                ? drivers.find((d) => d.CarIdx === carIdx)
                : null;

        return {
            driver: info?.UserName ?? 'Unknown driver',
            carNumber:
                info?.CarNumber ?? (info?.CarNumberRaw != null ? String(info.CarNumberRaw) : null),
            carName: info?.CarScreenName ?? null,
        };
    }
}

module.exports = { StrategyEngine };
