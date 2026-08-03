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

// A lapped car's gap is a lap count, not a time — a stale/meaningless
// F2Time diff otherwise (iRacing doesn't zero it out across a lap
// difference). lapsDown is however many whole laps behind the reference
// point (leader, or the car ahead) this row already is.
export function formatGapOrLaps(seconds, isLeader, lapsDown) {
  if (isLeader) return 'Leader';
  if (lapsDown > 0) return `-${lapsDown} Lap${lapsDown > 1 ? 's' : ''}`;
  return formatGap(seconds, isLeader);
}

// CarIdxLap is -1 before a car has completed its first lap (sitting on
// the grid, out lap not yet done, etc.) — not a real lap count, so it
// can't be diffed against another car's lap without producing a
// meaningless "-26 Laps"-style result.
function lapsBehind(referenceLap, lap) {
  if (referenceLap == null || lap == null || referenceLap < 0 || lap < 0) return 0;
  return Math.max(0, referenceLap - lap);
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
        carName: driver.CarScreenName ?? '—',
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
  // Interval stays relative to the overall running order (the car
  // physically ahead may be a different class), but a class leader has
  // nothing meaningful to show an interval against — they're already at
  // the front of their own class regardless of who's ahead overall.
  //
  // Gap, on the other hand, is relative to each row's own class leader,
  // not the overall race leader — a P2-in-class row should show how far
  // behind ITS class leader it is, not the overall leader's gap.
  const classLeaderByClassId = new Map();
  for (const row of rows) {
    if (row.classPosition === 1 && !classLeaderByClassId.has(row.classId)) {
      classLeaderByClassId.set(row.classId, row);
    }
  }

  return rows.map((row, i) => {
    const isLeader = row.position === 1;
    const isClassLeader = row.classPosition === 1;
    const carAhead = rows[i - 1];
    const interval =
      !isLeader && carAhead && row.gapToLeaderSeconds != null && carAhead.gapToLeaderSeconds != null
        ? row.gapToLeaderSeconds - carAhead.gapToLeaderSeconds
        : null;
    const lapsBehindCarAhead = carAhead ? lapsBehind(carAhead.lap, row.lap) : 0;

    const classLeader = classLeaderByClassId.get(row.classId);
    const gapToClassLeaderSeconds =
      !isClassLeader && classLeader && row.gapToLeaderSeconds != null && classLeader.gapToLeaderSeconds != null
        ? row.gapToLeaderSeconds - classLeader.gapToLeaderSeconds
        : null;
    const lapsDownInClass = classLeader ? lapsBehind(classLeader.lap, row.lap) : 0;

    return {
      ...row,
      gapToLeader: formatGapOrLaps(gapToClassLeaderSeconds, isClassLeader, lapsDownInClass),
      interval: isClassLeader ? '—' : formatGapOrLaps(interval, false, lapsBehindCarAhead),
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

  let classCarBehind = null;
  const trafficBehind = [];
  for (let i = playerIndex + 1; i < rows.length; i++) {
    const candidate = rows[i];
    if (candidate.classId === player.classId) {
      classCarBehind = candidate;
      break;
    }
    trafficBehind.push(candidate);
  }
  // Walked forward, already in running order — no reverse needed here.

  const gapSeconds =
    classCarAhead && player.gapToLeaderSeconds != null && classCarAhead.gapToLeaderSeconds != null
      ? player.gapToLeaderSeconds - classCarAhead.gapToLeaderSeconds
      : null;
  const lapsDownAhead = classCarAhead ? lapsBehind(classCarAhead.lap, player.lap) : 0;

  const gapBehindSeconds =
    classCarBehind && player.gapToLeaderSeconds != null && classCarBehind.gapToLeaderSeconds != null
      ? classCarBehind.gapToLeaderSeconds - player.gapToLeaderSeconds
      : null;
  const lapsDownBehind = classCarBehind ? lapsBehind(player.lap, classCarBehind.lap) : 0;

  return {
    player,
    classCarAhead,
    gap: classCarAhead ? formatGapOrLaps(gapSeconds, false, lapsDownAhead) : 'Class leader',
    traffic,
    trafficCount: traffic.length,
    classCarBehind,
    gapBehind: classCarBehind
      ? formatGapOrLaps(gapBehindSeconds, false, lapsDownBehind)
      : 'Last in class',
    trafficBehind,
    trafficBehindCount: trafficBehind.length,
  };
}
