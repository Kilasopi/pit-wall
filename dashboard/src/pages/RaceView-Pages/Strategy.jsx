import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { buildLeaderboardRows } from '@/hooks/convertLeaderboardData';
import { usePitCycleTracker } from '@/hooks/usePitCycleTracker';

function formatClockTime(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function StintHistoryCard({ stint, stintHistory }) {
  const rows = [
    ...(stint ? [{ ...stint, inProgress: true }] : []),
    ...stintHistory.map((s) => ({ ...s, inProgress: false })),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stint History</CardTitle>
        <CardDescription>
          {rows.length > 0 ? `${rows.length} stint${rows.length === 1 ? '' : 's'}` : 'No stints yet'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Car</TableHead>
                <TableHead>Laps</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Ended</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.driver ?? '—'}</TableCell>
                  <TableCell>
                    {row.carNumber ? `#${row.carNumber}` : '—'} {row.carName ?? ''}
                  </TableCell>
                  <TableCell>{row.lapsCompleted ?? 0}</TableCell>
                  <TableCell>{formatClockTime(row.startedAt)}</TableCell>
                  <TableCell>{row.inProgress ? '—' : formatClockTime(row.endedAt)}</TableCell>
                  <TableCell>
                    {row.inProgress ? (
                      <Badge variant="default">In Progress</Badge>
                    ) : (
                      <Badge variant="outline">Completed</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">Waiting for stint telemetry…</p>
        )}
      </CardContent>
    </Card>
  );
}

function PitCycleTrackerCard({ session, telemetry, lockedCarNumber }) {
  const drivers = session?.DriverInfo?.Drivers ?? [];
  // Locked car takes priority over the camera — see GapBoardCard.jsx for
  // why. CamCarIdx, not DriverInfo.DriverCarIdx, when unlocked.
  const playerCarIdx =
    lockedCarNumber != null
      ? drivers.find((d) => String(d.CarNumber) === String(lockedCarNumber))?.CarIdx
      : telemetry?.CamCarIdx;
  const tracker = usePitCycleTracker(telemetry);

  const allRows = buildLeaderboardRows(drivers, telemetry);
  const player = allRows.find((row) => row.carIdx === playerCarIdx);
  const rows = player ? allRows.filter((row) => row.classId === player.classId) : allRows;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pit Cycle Tracker</CardTitle>
        <CardDescription>
          {player
            ? 'Pit road visits and last pit lap for cars in your class'
            : 'Pit road visits and last pit lap'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pos</TableHead>
                <TableHead>Car #</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Pit Visits</TableHead>
                <TableHead>Last Pit Lap</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.carIdx}
                  className={row.carIdx === playerCarIdx ? 'bg-accent/50' : undefined}
                >
                  <TableCell>{row.position}</TableCell>
                  <TableCell>#{row.carNumber ?? '—'}</TableCell>
                  <TableCell>{row.driverName ?? '—'}</TableCell>
                  <TableCell>{tracker.getVisitCount(row.carIdx)}</TableCell>
                  <TableCell>{tracker.getLastPitLap(row.carIdx) ?? '—'}</TableCell>
                  <TableCell>
                    {row.onPitRoad ? (
                      <Badge variant="secondary">Pit</Badge>
                    ) : !row.onTrack ? (
                      <Badge variant="outline">Off</Badge>
                    ) : (
                      <Badge variant="default">Track</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">Waiting for session telemetry…</p>
        )}
      </CardContent>
    </Card>
  );
}

function Strategy({ session, telemetry, stint, stintHistory, lockedCarNumber }) {
  return (
    <div className="space-y-4">
      <PitCycleTrackerCard session={session} telemetry={telemetry} lockedCarNumber={lockedCarNumber} />
      <StintHistoryCard stint={stint} stintHistory={stintHistory ?? []} />
    </div>
  );
}

export default Strategy;
