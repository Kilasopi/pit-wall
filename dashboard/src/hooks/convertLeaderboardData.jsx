// iRacing sends class colors as a packed 0xRRGGBB integer.
export function classColorToCss(colorInt) {
  if (colorInt == null) return '#888888';
  return `#${(colorInt & 0xffffff).toString(16).padStart(6, '0')}`;
}

export function formatLapTime(seconds) {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return '—';
  const minutes = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3).padStart(6, '0');
  return `${minutes}:${secs}`;
}

// CarIdxF2Time is iRacing's "time behind leader" gap in seconds.
export function formatGap(seconds, isLeader) {
  if (isLeader) return 'Leader';
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—';
  return `+${seconds.toFixed(3)}`;
}

// Unique car classes present in the session, in first-seen order.
export function getSessionClasses(drivers) {
  const seen = new Map();
  for (const driver of drivers ?? []) {
    if (driver.CarIsPaceCar || driver.IsSpectator) continue;
    if (driver.CarClassID == null || seen.has(driver.CarClassID)) continue;
    seen.set(driver.CarClassID, {
      id: driver.CarClassID,
      shortName: driver.CarClassShortName ?? driver.CarClassName ?? `Class ${driver.CarClassID}`,
      color: classColorToCss(driver.CarClassColor),
    });
  }
  return [...seen.values()];
}

// Joins session driver info with live per-car telemetry arrays into rows
// sorted by overall running position.
export function buildLeaderboardRows(drivers, telemetry) {
  const position = telemetry?.CarIdxPosition;
  const classPosition = telemetry?.CarIdxClassPosition;
  const lap = telemetry?.CarIdxLap;
  const bestLap = telemetry?.CarIdxBestLapTime;
  const lastLap = telemetry?.CarIdxLastLapTime;
  const onPitRoad = telemetry?.CarIdxOnPitRoad;
  const trackSurface = telemetry?.CarIdxTrackSurface;
  const gapToLeader = telemetry?.CarIdxF2Time;

  const at = (arr, idx) => (Array.isArray(arr) ? arr[idx] : undefined);

  const rows = (drivers ?? [])
    .filter((driver) => !driver.CarIsPaceCar && !driver.IsSpectator)
    .map((driver) => {
      const idx = driver.CarIdx;
      return {
        carIdx: idx,
        classId: driver.CarClassID,
        classColor: classColorToCss(driver.CarClassColor),
        classShortName: driver.CarClassShortName ?? driver.CarClassName ?? `Class ${driver.CarClassID}`,
        carNumber: driver.CarNumber,
        driverName: driver.UserName,
        teamName: driver.TeamName ?? '—',
        iRating: driver.IRating ?? null,
        safetyRating: driver.LicString ?? '—',
        position: at(position, idx) ?? 0,
        classPosition: at(classPosition, idx) ?? 0,
        lap: at(lap, idx) ?? 0,
        bestLapTime: formatLapTime(at(bestLap, idx)),
        lastLapTime: formatLapTime(at(lastLap, idx)),
        gapToLeaderSeconds: at(gapToLeader, idx),
        onPitRoad: !!at(onPitRoad, idx),
        onTrack: at(trackSurface, idx) != null && at(trackSurface, idx) !== -1,
      };
    })
    .filter((row) => row.position > 0)
    .sort((a, b) => a.position - b.position);

  // Interval = this car's gap to leader minus the car ahead's gap to
  // leader — iRacing doesn't broadcast a direct car-to-car interval field.
  return rows.map((row, i) => {
    const isLeader = row.position === 1;
    const carAhead = rows[i - 1];
    const interval =
      !isLeader && carAhead && row.gapToLeaderSeconds != null && carAhead.gapToLeaderSeconds != null
        ? row.gapToLeaderSeconds - carAhead.gapToLeaderSeconds
        : null;

    return {
      ...row,
      gapToLeader: formatGap(row.gapToLeaderSeconds, isLeader),
      interval: isLeader ? '—' : formatGap(interval, false),
    };
  });
}

// Finds the player's next same-class rival ahead on track, plus any
// different-class cars physically between them ("traffic") — iRacing has
// no such field directly, so this walks the position-sorted rows built
// above and compares classId against the player's.
export function buildGapBoard(drivers, telemetry, playerCarIdx) {
  const rows = buildLeaderboardRows(drivers, telemetry);
  const playerIndex = rows.findIndex((row) => row.carIdx === playerCarIdx);
  if (playerIndex === -1) return null;

  const player = rows[playerIndex];

  let classCarAhead = null;
  const traffic = [];
  for (let i = playerIndex - 1; i >= 0; i--) {
    const candidate = rows[i];
    if (candidate.classId === player.classId) {
      classCarAhead = candidate;
      break;
    }
    traffic.push(candidate);
  }
  // Walked backwards (closest to player first) — flip to running order.
  traffic.reverse();

  const gapSeconds =
    classCarAhead && player.gapToLeaderSeconds != null && classCarAhead.gapToLeaderSeconds != null
      ? player.gapToLeaderSeconds - classCarAhead.gapToLeaderSeconds
      : null;

  return {
    player,
    classCarAhead,
    gap: classCarAhead ? formatGap(gapSeconds, false) : 'Class leader',
    traffic,
    trafficCount: traffic.length,
  };
}
