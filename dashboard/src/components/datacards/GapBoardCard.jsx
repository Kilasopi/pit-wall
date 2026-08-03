import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buildGapBoard } from '@/hooks/convertLeaderboardData';

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
          {board ? 'Next same-class car ahead' : hasSession ? 'Not currently driving' : 'No session data yet'}
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
        ) : !board.classCarAhead ? (
          <p className="text-sm text-muted-foreground">
            You're the class leader — no same-class car ahead.
          </p>
        ) : (
          <div className="space-y-3">
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

            {board.trafficCount === 0 ? (
              <p className="text-sm text-muted-foreground">Clear track — no traffic in between.</p>
            ) : (
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground">
                  {board.trafficCount} car{board.trafficCount === 1 ? '' : 's'} of traffic in between:
                </p>
                <ul className="space-y-1">
                  {board.traffic.map((car) => (
                    <li
                      key={car.carIdx}
                      className="flex items-center justify-between text-sm text-muted-foreground"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: car.classColor }}
                        />
                        #{car.carNumber ?? '—'} {car.driverName ?? '—'}
                        <span className="text-xs">({car.classShortName})</span>
                      </span>
                      <span className="tabular-nums">{car.interval}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
