import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardAction
} from '@/components/ui/card';

import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '@/components/ui/table';

import { SpectateFuelCard } from '@/components/datacards/SpectateFuelCard';
import { PitwallTitle } from '@/components/PitwallTitle';
import { TrackMapCard } from '@/components/datacards/TrackMapCard';
import { buildLeaderboardRows } from '@/hooks/convertLeaderboardData';

import { 
    formatTimeRemaining,
    convertSkies,
    radiansToCompass
} from '@/hooks/convertTrackInfoData';

// This page is intended to be a simplified spectator page for non drivers
// Minimal strategy functionality. But informative for users
// Main audience: Family and friends who want to watch along



function Spectate({ session, telemetry, stint, displayName, trackMap, fuel }) {

    const { theme, toggleTheme } = useTheme();
    
    // Find the car ID for Team MURDER
    const drivers = session?.DriverInfo?.Drivers ?? [];
    const playerCarIdx = drivers.find(
        (d) => String(d.CarNumber) === String(stint?.carNumber)
    )?.CarIdx;
    
    // Track Info
    const trackName = session?.WeekendInfo?.TrackDisplayName ?? '—';
    const trackLength = session?.WeekendInfo?.TrackLengthOfficial ?? '—';
    const trackNumTurns = session?.WeekendInfo?.TrackNumTurns ?? '—';
    const trackCity = session?.WeekendInfo?.TrackCity ?? '—';
    const trackState = session?.WeekendInfo?.TrackState ?? '';
    const trackCountry = session?.WeekendInfo?.TrackCountry ?? '—';

    // Track Weather
    const { Label: skies, Icon: SkiesIcon } = convertSkies(telemetry?.Skies);
    const airTemp = telemetry?.AirTemp?.toFixed(1) ?? '—';
    const trackTemp = telemetry?.TrackTemp?.toFixed(1) ?? '—';
    const humidity = (telemetry?.RelativeHumidity * 100)?.toFixed(0) ?? '—';
    const windSpeed = 
        telemetry?.WindVel != null
        ? (telemetry.WindVel * 3.6).toFixed(1)
        : '—';
    const windDirection = telemetry?.WindDir ?? '—';
    const precipitation = 
    telemetry?.Precipitation != null
        ? (telemetry.Precipitation * 100).toFixed(1)
        : '—';

    // Session Info
    const sessionTimeRem = formatTimeRemaining(telemetry?.SessionTimeRemain);
    const laps = telemetry?.CarIdxLap?.[playerCarIdx]; // Total laps team MURDER
    
    // Car Info
    const carName = stint?.carName;
    const carNumber = stint?.carNumber;
    const percentage = telemetry?.FuelLevelPct != null ? telemetry.FuelLevelPct * 100 : 0;
    const fuelLitres = telemetry?.FuelLevel;
    const lapsRemainingEst = fuel?.lapsRemainingEst;

    // Driver Info
    const driver = stint?.driver;
    const driverLapsStint = stint?.lapsCompleted; // Laps done this stint by driver
    const driverTotalLaps = stint?.totalLapsCompleted; // Total laps driver individual

    // Leaderboard Info
    const leaderboardRows = buildLeaderboardRows(drivers, telemetry);
    const teamRowIndex = leaderboardRows.findIndex((row) => row.carIdx === playerCarIdx);
    const simplifiedRows = teamRowIndex === -1
        ? leaderboardRows.slice(0, 5)
        : leaderboardRows.slice(Math.max(0, teamRowIndex - 2), teamRowIndex + 3);
    const teamRow = teamRowIndex === -1 ? null : leaderboardRows[teamRowIndex];

    return(
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between ">
                <PitwallTitle
                    usage="Spectating"
                    displayName={displayName ?? `Team M.U.R.D.E.R`}
                />
                <span className="text-md text-muted-foreground">Car Number: #{carNumber ?? '—'}</span>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span
                        className="inline-block size-2 shrink-0 rounded-full bg-muted-foreground"
                        style={teamRow ? { backgroundColor: teamRow.classColor } : undefined}
                    />
                    Class: {teamRow?.classShortName ?? '—'}
                </span>
                <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                    {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </button>
            </div>

            <TrackMapCard
                trackMap={trackMap}
                telemetry={telemetry}
                session={session}
                lockedCarNumber={stint?.carNumber}
            />

            <div className='grid grid-cols-4 gap-4'>
                <Card>
                    <CardHeader>
                        <CardTitle>Track Info</CardTitle>
                        <CardDescription>Info about the track</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <dl className="grid grid-cols-2 gap-y-1 text-sm">
                            <dt className="text-muted-foreground">Track Name</dt>
                            <dd>{trackName}</dd>
                            <dt className="text-muted-foreground">Track Length</dt>
                            <dd>{trackLength}</dd>
                            <dt className="text-muted-foreground">Number of Turns</dt>
                            <dd>{trackNumTurns}</dd>
                            <dt className="text-muted-foreground">Country</dt>
                            <dd>{trackCountry}</dd>
                            <dt className="text-muted-foreground">Track Location</dt>
                            <dd>{trackCity}{trackState ?  `, ${trackState}` : ``}</dd>
                        </dl>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Weather</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl className="grid grid-cols-2 gap-y-1 text-sm">
                            <dt className="text-muted-foreground">Conditions</dt>
                            <dd>{skies ?? '—'}</dd>
                            <dt className="text-muted-foreground">Air Temp | Track Temp</dt>
                            <dd>{airTemp ?? '—'} | {trackTemp ?? '—'}</dd>
                            <dt className="text-muted-foreground">Wind Info</dt>
                            <dd>Speed: {windSpeed ?? '—'} km/h | Direction: {radiansToCompass(windDirection).direction ?? '—'} | Degrees: {radiansToCompass(windDirection).degrees.toFixed(1) ?? '—'} °</dd>
                            <dt className="text-muted-foreground">Precipitation | Humidity</dt>
                            <dd>{precipitation ?? '—'} | {humidity ?? '—'}</dd>
                        </dl>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Session Info</CardTitle>
                        <CardDescription>Info about the race event</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <dl className="grid grid-cols-2 gap-y-1 text-sm">
                            <dt className="text-muted-foreground">Time Remaining:</dt>
                            <dd>{sessionTimeRem}</dd>
                            <dt className="text-muted-foreground">Total Laps Completed:</dt>
                            <dd>{laps ?? `—`}</dd>
                        </dl>

                        <dl className="grid grid-cols-2 gap-y-1 text-sm">
                            <dt className="text-muted-foreground">Car:</dt>
                            <dd>{carName ?? `—`}</dd>
                            <dt className="text-muted-foreground">Class:</dt>
                            <dd>{teamRow?.classShortName ?? `—`}</dd>
                        </dl>

                        <dl className="grid grid-cols-2 gap-y-1 text-sm">
                            <dt className="text-muted-foreground">Current Driver:</dt>
                            <dd>{driver ?? `—`}</dd>
                            <dt className="text-muted-foreground">Laps this stint:</dt>
                            <dd>{driverLapsStint ?? `—`}</dd>
                            <dt className="text-muted-foreground">Laps for this Driver:</dt>
                            <dd>{driverTotalLaps ?? `—`}</dd>
                        </dl>
                    </CardContent>
                </Card>
                <SpectateFuelCard percentage={percentage} fuelLitres={fuelLitres} lapsRemainingEst={lapsRemainingEst}/>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Leaderboard</CardTitle>
                    <CardDescription>Around Team MURDER</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Pos</TableHead>
                                <TableHead>Class Pos</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Car #</TableHead>
                                <TableHead>Car</TableHead>
                                <TableHead>Driver</TableHead>
                                <TableHead>Team</TableHead>
                                <TableHead>Lap</TableHead>
                                <TableHead>Gap</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {simplifiedRows.map((row) => (
                                <TableRow
                                    key={row.carIdx}
                                    className={row.carIdx === playerCarIdx ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : ''}
                                >
                                    <TableCell>{row.position}</TableCell>
                                    <TableCell>{row.classPosition}</TableCell>
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
                                    <TableCell>{row.carName}</TableCell>
                                    <TableCell>{row.driverName ?? '—'}</TableCell>
                                    <TableCell>{row.teamName}</TableCell>
                                    <TableCell>{row.lap}</TableCell>
                                    <TableCell>{row.gapToLeader}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

export default Spectate;