import { useState } from 'react';
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
import { cn } from '@/lib/utils';
import { getSessionClasses, buildLeaderboardRows } from '@/hooks/convertLeaderboardData';

function Leaderboard({ session, telemetry }) {
  const [inactiveClassIds, setInactiveClassIds] = useState(() => new Set());

  const drivers = session?.DriverInfo?.Drivers ?? [];
  const classes = getSessionClasses(drivers);
  const rows = buildLeaderboardRows(drivers, telemetry).filter(
    (row) => !inactiveClassIds.has(row.classId)
  );
  const isMultiClass = classes.length > 1;

  function toggleClass(classId) {
    setInactiveClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {classes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {classes.map((cls) => {
            const active = !inactiveClassIds.has(cls.id);
            return (
              <button
                key={cls.id}
                type="button"
                onClick={() => toggleClass(cls.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-opacity',
                  active ? 'opacity-100' : 'opacity-40'
                )}
                style={{ borderColor: cls.color }}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: cls.color }}
                />
                {cls.shortName}
              </button>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>
            {rows.length > 0 ? `${rows.length} cars shown` : 'No session data yet'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pos</TableHead>
                  {isMultiClass && <TableHead>Class Pos</TableHead>}
                  <TableHead>Class</TableHead>
                  <TableHead>Car #</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>iRating</TableHead>
                  <TableHead>SR</TableHead>
                  <TableHead>Lap</TableHead>
                  <TableHead>Last Lap</TableHead>
                  <TableHead>Best Lap</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead>Gap</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.carIdx}>
                    <TableCell>{row.position}</TableCell>
                    {isMultiClass && <TableCell>{row.classPosition}</TableCell>}
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: row.classColor }}
                        />
                        {row.classShortName}
                      </span>
                    </TableCell>
                    <TableCell>#{row.carNumber ?? '—'}</TableCell>
                    <TableCell>{row.driverName ?? '—'}</TableCell>
                    <TableCell>{row.teamName}</TableCell>
                    <TableCell>{row.iRating ?? '—'}</TableCell>
                    <TableCell>{row.safetyRating}</TableCell>
                    <TableCell>{row.lap}</TableCell>
                    <TableCell>{row.lastLapTime}</TableCell>
                    <TableCell>{row.bestLapTime}</TableCell>
                    <TableCell>{row.interval}</TableCell>
                    <TableCell>{row.gapToLeader}</TableCell>
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
            <p className="text-sm text-muted-foreground">
              Waiting for session telemetry…
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Leaderboard;
