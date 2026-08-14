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
        // 0-1 position around the current lap, ignoring total laps
        // completed — this is what "who's physically next to me on track
        // right now" has to sort by. A lapped leader can have a
        // trackDistance a lap+ higher than the player while being right on
        // their bumper physically; only lapDistPct captures that.
        lapDistPct: rowLapDistPct ?? null,
        // Total distance travelled in lap units — increases continuously
        // as the car drives, unlike position/lap which only tick over at
        // the start/finish line. Used for "how far apart are we" (a smooth
        // number that updates every tick) and for telling a genuine
        // same-lap rival apart from a lapped car — NOT for "who's
        // physically nearby", which needs lapDistPct instead (see above).
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

// Finds the player's next same-class rival ahead/behind, plus any cars
// physically between them ("traffic") — iRacing has no such field
// directly. WHO the rival is comes from official class position (P7/P8/P9
// — authoritative, and correct even for a car that's lapped the player
// several times but happens to be momentarily close by while catching up
// for another lap). The traffic list and gap time, however, are still
// live: which cars are physically between the player and that known rival
// updates every tick via on-track position, not just at lap crossings.
export function buildGapBoard(drivers, telemetry, playerCarIdx) {
  const rows = buildBaseRows(drivers, telemetry).filter(
    (row) => row.trackDistance != null && row.lapDistPct != null
  );

  const player = rows.find((row) => row.carIdx === playerCarIdx);
  if (!player) return null;

  const classCarAhead =
    player.classPosition > 1
      ? rows.find(
          (row) => row.classId === player.classId && row.classPosition === player.classPosition - 1
        ) ?? null
      : null;
  const classCarBehind =
    rows.find(
      (row) => row.classId === player.classId && row.classPosition === player.classPosition + 1
    ) ?? null;

  // Physical position around the current lap (0→1, wrapping) — not
  // accumulated trackDistance, which would sort a lapped car nowhere near
  // the player despite them being right on track next to each other.
  const byPct = [...rows].sort((a, b) => a.lapDistPct - b.lapDistPct);
  const n = byPct.length;
  const playerPctIndex = byPct.findIndex((row) => row.carIdx === playerCarIdx);

  // Walk physically forward from the player to the known rival ahead,
  // collecting everyone passed along the way as traffic — correctly picks
  // up lapped cars/the leader lapping through, live, every tick.
  const traffic = [];
  if (classCarAhead) {
    for (let step = 1; step < n; step++) {
      const candidate = byPct[(playerPctIndex + step) % n];
      if (candidate.carIdx === classCarAhead.carIdx) break;
      traffic.push(candidate);
    }
    traffic.reverse();
  }

  const trafficBehind = [];
  if (classCarBehind) {
    for (let step = 1; step < n; step++) {
      const candidate = byPct[(playerPctIndex - step + n) % n];
      if (candidate.carIdx === classCarBehind.carIdx) break;
      trafficBehind.push(candidate);
    }
  }

  // How many whole laps of *track distance* separate the player and their
  // rival — not raw CarIdxLap integers, which jump by 1 the instant either
  // car crosses start/finish even if they're only a car-length apart.
  // trackDistance (lap + lap%) changes continuously, so this only reaches
  // 1 once the gap has genuinely grown to a full lap, not at a crossing.
  const lapsDownByDistance = (fartherTrackDistance, closerTrackDistance) => {
    if (fartherTrackDistance == null || closerTrackDistance == null) return 0;
    return Math.max(0, Math.floor(fartherTrackDistance - closerTrackDistance));
  };

  const lapsDownAhead = classCarAhead
    ? lapsDownByDistance(classCarAhead.trackDistance, player.trackDistance)
    : 0;
  const gapSeconds = classCarAhead ? liveGapSeconds(classCarAhead, player) : null;
  // iRacing's own gap-to-leader per car, differenced — accurate but only
  // steps at timing-line crossings. GapBoardCard blends this with the
  // continuously-ticking distance estimate above (see useBlendedGapSeconds).
  const gapOfficialSeconds =
    classCarAhead && player.gapToLeaderSeconds != null && classCarAhead.gapToLeaderSeconds != null
      ? player.gapToLeaderSeconds - classCarAhead.gapToLeaderSeconds
      : null;

  const lapsDownBehind = classCarBehind
    ? lapsDownByDistance(player.trackDistance, classCarBehind.trackDistance)
    : 0;
  const gapBehindSeconds = classCarBehind ? liveGapSeconds(player, classCarBehind) : null;
  const gapBehindOfficialSeconds =
    classCarBehind && classCarBehind.gapToLeaderSeconds != null && player.gapToLeaderSeconds != null
      ? classCarBehind.gapToLeaderSeconds - player.gapToLeaderSeconds
      : null;

  return {
    player,
    classCarAhead,
    gapSeconds,
    gapOfficialSeconds,
    lapsDownAhead,
    gap: classCarAhead ? formatGapOrLaps(gapSeconds, false, lapsDownAhead) : 'Class leader',
    trafficCount: traffic.length,
    trafficByClass: summarizeTrafficByClass(traffic),
    classCarBehind,
    gapBehindSeconds,
    gapBehindOfficialSeconds,
    lapsDownBehind,
    gapBehind: classCarBehind
      ? formatGapOrLaps(gapBehindSeconds, false, lapsDownBehind)
      : 'Last in class',
    trafficBehindCount: trafficBehind.length,
    trafficBehindByClass: summarizeTrafficByClass(trafficBehind),
  };
}
