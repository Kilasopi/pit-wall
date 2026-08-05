import { Badge } from '@/components/ui/badge';
import { TrackMapCard } from '@/components/datacards/TrackMapCard';
import { GapBoardCard } from '@/components/datacards/GapBoardCard';
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

function fuelVariant(lapsRemaining) {
  if (lapsRemaining == null) return 'outline';
  if (lapsRemaining <= 3) return 'destructive';
  if (lapsRemaining <= 8) return 'secondary';
  return 'default';
}

function PitWall({ stint, fuel, incidents, telemetry, session, trackMap }) {
  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      <TrackMapCard trackMap={trackMap} telemetry={telemetry} session={session} />

      <GapBoardCard telemetry={telemetry} session={session} />

      <Card>
        <CardHeader>
          <CardTitle>Current Stint</CardTitle>
          <CardDescription>
            {stint ? `Car #${stint.carNumber ?? '—'}` : 'No stint data yet'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stint ? (
            <dl className="grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Driver</dt>
              <dd>{stint.driver}</dd>
              <dt className="text-muted-foreground">Car</dt>
              <dd>{stint.carName ?? '—'}</dd>
              <dt className="text-muted-foreground">Laps completed</dt>
              <dd>{stint.lapsCompleted ?? '—'}</dd>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              Waiting for stint telemetry…
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fuel</CardTitle>
          <CardDescription>
            {fuel?.source ? `Source: ${fuel.source}` : 'No fuel data yet'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fuel ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-medium">
                {fuel.lapsRemainingEst}
              </span>
              <span className="text-sm text-muted-foreground">laps remaining (est.)</span>
              <Badge variant={fuelVariant(fuel.lapsRemainingEst)}>
                {fuel.lapsRemainingEst <= 3 ? 'Pit soon' : 'OK'}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Waiting for fuel telemetry…
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Incidents</CardTitle>
          <CardDescription>{incidents.length} logged</CardDescription>
        </CardHeader>
        <CardContent>
          {incidents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lap</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident, i) => (
                  <TableRow key={i}>
                    <TableCell>{incident.lap ?? '—'}</TableCell>
                    <TableCell>{incident.description}</TableCell>
                    <TableCell>
                      {incident.points != null ? (
                        <Badge variant={incident.points >= 4 ? 'destructive' : 'secondary'}>
                          {incident.points}x
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No incidents logged</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PitWall;
