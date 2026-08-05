import { useRef } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buildGapBoard, formatGap } from '@/hooks/convertLeaderboardData';

// iRacing's own gap-to-leader (F2Time-derived) is accurate but only steps
// at timing-line crossings — showing it alone looks frozen between them.
// The raw distance-based estimate ticks every frame but drifts noticeably
// since it assumes constant pace across the lap. This blends them: anchor
// to the official value whenever it changes (a real crossing, or a new
// car pairing after an overtake), then ride the distance estimate's
// *change* since that anchor rather than trusting its absolute value.
function useBlendedGap(officialSeconds, liveSeconds, pairKey) {
  const baselineRef = useRef({ key: null, official: null, live: null });

  if (officialSeconds == null || liveSeconds == null) return liveSeconds;

  const baseline = baselineRef.current;
  if (baseline.key !== pairKey || baseline.official !== officialSeconds) {
    baselineRef.current = { key: pairKey, official: officialSeconds, live: liveSeconds };
    return officialSeconds;
  }

  return baseline.official + (liveSeconds - baseline.live);
}

function TrafficSummary({ count, byClass }) {
  if (count === 0) {
    return <p className="text-sm text-muted-foreground">Clear track — no traffic in between.</p>;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm text-muted-foreground">
        {count} car{count === 1 ? '' : 's'} of traffic in between:
      </p>
      <div className="flex flex-wrap gap-1.5">
        {byClass.map((cls) => (
          <Badge key={cls.classId} variant="outline" className="gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: cls.color }} />
            {cls.count} {cls.shortName}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function GapBoardCard({ session, telemetry, lockedCarNumber }) {
  const drivers = session?.DriverInfo?.Drivers ?? [];
  // If spectator-locked to a car (see SpectateLockCard/agent/
  // strategy_engine.js), the gap board has to track that same car too —
  // otherwise it silently follows wherever the camera drifts while the
  // rest of the pitwall (stint, incidents) stays on the locked car,
  // producing gaps for a completely different car than what's displayed.
  // CamCarIdx, not DriverInfo.DriverCarIdx, when unlocked — this rig
  // spectates via camera rather than driving a fixed session slot, and
  // DriverCarIdx doesn't follow the camera (see agent/strategy_engine.js
  // for the same reasoning).
  const playerCarIdx =
    lockedCarNumber != null
      ? drivers.find((d) => String(d.CarNumber) === String(lockedCarNumber))?.CarIdx
      : telemetry?.CamCarIdx;
  const hasSession = drivers.length > 0;
  const board = buildGapBoard(drivers, telemetry, playerCarIdx);

  // Hooks run unconditionally even though board can be null (not on
  // track yet) — both just pass through nulls in that case.
  const blendedAhead = useBlendedGap(
    board?.gapOfficialSeconds ?? null,
    board?.gapSeconds ?? null,
    board?.classCarAhead?.carIdx ?? null
  );
  const blendedBehind = useBlendedGap(
    board?.gapBehindOfficialSeconds ?? null,
    board?.gapBehindSeconds ?? null,
    board?.classCarBehind?.carIdx ?? null
  );
  // Laps-down cars show "-N Laps", not a time — never blend that case.
  const gapDisplay =
    board?.classCarAhead && board.lapsDownAhead === 0 ? formatGap(blendedAhead, false) : board?.gap;
  const gapBehindDisplay =
    board?.classCarBehind && board.lapsDownBehind === 0
      ? formatGap(blendedBehind, false)
      : board?.gapBehind;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gap Board</CardTitle>
        <CardDescription>
          {board ? 'Nearest same-class cars ahead and behind' : hasSession ? 'Not currently driving' : 'No session data yet'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasSession ? (
          <p className="text-sm text-muted-foreground">Waiting for session telemetry…</p>
        ) : !board ? (
          <p className="text-sm text-muted-foreground">
            You're not in a car with a race position right now (spectating, in the pits before
            the green flag, etc.) — this fills in once you're on track.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ahead
              </p>
              {!board.classCarAhead ? (
                <p className="text-sm text-muted-foreground">
                  You're the class leader — no same-class car ahead.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: board.classCarAhead.classColor }}
                      />
                      <span className="font-medium">
                        #{board.classCarAhead.carNumber ?? '—'} {board.classCarAhead.driverName ?? '—'}
                      </span>
                      <Badge variant="outline">P{board.classCarAhead.classPosition} in class</Badge>
                    </div>
                    <span className="text-lg font-semibold tabular-nums">{gapDisplay}</span>
                  </div>

                  <TrafficSummary count={board.trafficCount} byClass={board.trafficByClass} />
                </>
              )}
            </div>

            <div className="space-y-3 border-t pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Behind
              </p>
              {!board.classCarBehind ? (
                <p className="text-sm text-muted-foreground">
                  You're last in class — no same-class car behind.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: board.classCarBehind.classColor }}
                      />
                      <span className="font-medium">
                        #{board.classCarBehind.carNumber ?? '—'} {board.classCarBehind.driverName ?? '—'}
                      </span>
                      <Badge variant="outline">P{board.classCarBehind.classPosition} in class</Badge>
                    </div>
                    <span className="text-lg font-semibold tabular-nums">{gapBehindDisplay}</span>
                  </div>

                  <TrafficSummary
                    count={board.trafficBehindCount}
                    byClass={board.trafficBehindByClass}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
