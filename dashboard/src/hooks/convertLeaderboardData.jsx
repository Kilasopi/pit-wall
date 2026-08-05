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

// Joins session driver info with live per-car telemetry arrays into rows.
// Includes both iRacing's official race-classification fields (position,
// F2Time gap) and raw on-track distance (lap + lap-distance-percent) —
// the latter is what buildGapBoard uses instead, since the official
// fields only get recomputed at lap/timing-line crossings while the raw
// distance updates on every telemetry tick.
function buildBaseRows(drivers, telemetry) {
  const position = telemetry?.CarIdxPosition;
  const classPosition = telemetry?.CarIdxClassPosition;
  const lap = telemetry?.CarIdxLap;
  const lapDistPct = telemetry?.CarIdxLapDistPct;
  const bestLap = telemetry?.CarIdxBestLapTime;
  const lastLap = telemetry?.CarIdxLastLapTime;
  const onPitRoad = telemetry?.CarIdxOnPitRoad;
  const trackSurface = telemetry?.CarIdxTrackSurface;
  const gapToLeader = telemetry?.CarIdxF2Time;

  const at = (arr, idx) => (Array.isArray(arr) ? arr[idx] : undefined);

  return (drivers ?? [])
    .filter((driver) => !driver.CarIsPaceCar && !driver.IsSpectator)
    .map((driver) => {
      const idx = driver.CarIdx;
      const rowLap = at(lap, idx) ?? 0;
      const rowLapDistPct = at(lapDistPct, idx);
      const bestLapSeconds = at(bestLap, idx);
      const lastLapSeconds = at(lastLap, idx);
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
        lap: rowLap,
        // Total distance travelled in lap units — increases continuously
        // as the car drives, unlike position/lap which only tick over at
        // the start/finish line. This is what makes "who's physically
        // between me and my rival" and "how far apart are we" update the
        // instant an overtake happens instead of on the next lap.
        trackDistance: rowLap >= 0 && rowLapDistPct != null ? rowLap + rowLapDistPct : null,
        bestLapTime: formatLapTime(bestLapSeconds),
        lastLapTime: formatLapTime(lastLapSeconds),
        bestLapSeconds: bestLapSeconds > 0 ? bestLapSeconds : null,
        lastLapSeconds: lastLapSeconds > 0 ? lastLapSeconds : null,
        gapToLeaderSeconds: at(gapToLeader, idx),
        onPitRoad: !!at(onPitRoad, idx),
        onTrack: at(trackSurface, idx) != null && at(trackSurface, idx) !== -1,
      };
    });
}

// Joins session driver info with live per-car telemetry arrays into rows
// sorted by overall running position — iRacing's official classification,
// which only updates at lap/timing-line crossings. Used for the
// Leaderboard page, which should reflect the official running order.
export function buildLeaderboardRows(drivers, telemetry) {
  const rows = buildBaseRows(drivers, telemetry)
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

// Per-car traffic gaps ride on CarIdxF2Time, which iRacing only
// recomputes at timing-line crossings rather than continuously — so a
// per-car gap number looks like it's "stuck" between laps even though
// it's accurate at the moment it updates. A class breakdown (counts, not
// individual gaps) sidesteps that: it only changes when the traffic
// itself changes, i.e. when the player actually clears a car, which is
// the update cadence that actually matches what changed.
function summarizeTrafficByClass(traffic) {
  const byClass = new Map();
  for (const car of traffic) {
    const existing = byClass.get(car.classId);
    if (existing) {
      existing.count += 1;
    } else {
      byClass.set(car.classId, {
        classId: car.classId,
        shortName: car.classShortName,
        color: car.classColor,
        count: 1,
      });
    }
  }
  return [...byClass.values()];
}

// Estimates a live, continuously-ticking time gap between two rows from
// their track-distance difference and a recent lap time, instead of
// iRacing's own F2Time (which only updates at timing-line crossings).
// aheadRow must actually be ahead of behindRow in trackDistance.
function liveGapSeconds(aheadRow, behindRow) {
  if (aheadRow?.trackDistance == null || behindRow?.trackDistance == null) return null;
  const distanceGapLaps = aheadRow.trackDistance - behindRow.trackDistance;
  if (distanceGapLaps < 0) return null;

  const lapTime =
    behindRow.lastLapSeconds ?? behindRow.bestLapSeconds ?? aheadRow.lastLapSeconds ?? aheadRow.bestLapSeconds;
  if (lapTime == null) return null;

  return distanceGapLaps * lapTime;
}

// Finds the player's next same-class rival ahead on track, plus any
// different-class cars physically between them ("traffic") — iRacing has
// no such field directly. Ordered by raw on-track distance rather than
// official race position/gap so both the traffic list and the gap time
// update the instant an overtake happens, not on the next lap/timing-line
// crossing.
export function buildGapBoard(drivers, telemetry, playerCarIdx) {
  const rows = buildBaseRows(drivers, telemetry)
    .filter((row) => row.trackDistance != null)
    .sort((a, b) => b.trackDistance - a.trackDistance);

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

  const lapsDownAhead = classCarAhead ? lapsBehind(classCarAhead.lap, player.lap) : 0;
  const gapSeconds = classCarAhead ? liveGapSeconds(classCarAhead, player) : null;

  const lapsDownBehind = classCarBehind ? lapsBehind(player.lap, classCarBehind.lap) : 0;
  const gapBehindSeconds = classCarBehind ? liveGapSeconds(player, classCarBehind) : null;

  return {
    player,
    classCarAhead,
    gap: classCarAhead ? formatGapOrLaps(gapSeconds, false, lapsDownAhead) : 'Class leader',
    trafficCount: traffic.length,
    trafficByClass: summarizeTrafficByClass(traffic),
    classCarBehind,
    gapBehind: classCarBehind
      ? formatGapOrLaps(gapBehindSeconds, false, lapsDownBehind)
      : 'Last in class',
    trafficBehindCount: trafficBehind.length,
    trafficBehindByClass: summarizeTrafficByClass(trafficBehind),
  };
}
