import { useState } from 'react';
import { useAgentSocket } from '@/hooks/useAgentSocket';
import { NavBar } from '@/components/NavBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

function PitWall() {
  const { connected, stint, fuel, incidents } = useAgentSocket();

  const [activeTab, setActiveTab] = useState('stint');

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-xl font-heading font-medium">Pit Wall</h1>
        <Badge variant={connected ? 'default' : 'destructive'}>
          {connected ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>

      <NavBar />

      <div className="mb-4">
        <div className="mb-4 inline-flex items-center rounded-lg bg-muted p-1">
          <Button
            type="button"
            onClick={() => setActiveTab('pitwall')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'pitwall'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Pit Wall
          </Button>
          <Button
            type="button"
            onClick={() => setActiveTab('track')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'track'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Track
          </Button>
        </div>
        {activeTab === 'pitwall' && (
          <div className="grid gap-4 md:grid-cols-2">
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
        )}
        {activeTab === 'track' && (
          <Card>
            <CardHeader>
              <CardTitle>Track</CardTitle>
              <CardDescription>
                Track information and telemetry
              </CardDescription>
            </CardHeader>

            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track information will go here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default PitWall;
