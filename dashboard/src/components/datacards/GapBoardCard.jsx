import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buildGapBoard } from '@/hooks/convertLeaderboardData';

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

export function GapBoardCard({ session, telemetry }) {
  const drivers = session?.DriverInfo?.Drivers ?? [];
  // CamCarIdx, not DriverInfo.DriverCarIdx — this rig spectates via camera
  // rather than driving a fixed session slot, and DriverCarIdx doesn't
  // follow the camera (see agent/strategy_engine.js for the same reasoning).
  const playerCarIdx = telemetry?.CamCarIdx;
  const hasSession = drivers.length > 0;
  const board = buildGapBoard(drivers, telemetry, playerCarIdx);

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
                    <span className="text-lg font-semibold tabular-nums">{board.gap}</span>
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
                    <span className="text-lg font-semibold tabular-nums">{board.gapBehind}</span>
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
