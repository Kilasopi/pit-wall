import { formatTimeRemaining, convertSkies } from '@/hooks/convertTrackInfoData';

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

// This page is intended to be a simplified spectator page for non drivers
// Minimal strategy functionality. But informative for users
// Main audience: Family and friends who want to watch along

function Spectate({ session, telemetry, stint }) {

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
    const percentage = telemetry?.FuelLevelPct != null ? telemetry.FuelLevelPct * 100 : 0;
    const fuelLitres = telemetry?.FuelLevel;

    // Driver Info
    const driver = stint?.driver;
    const carNumber = stint?.carNumber;
    const driverLapsStint = stint?.lapsCompleted; // Laps done this stint by driver
    const driverTotalLaps = stint?.totalLapsCompleted; // Total laps driver individual
    return(
        <div>
            <div>
                <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                    {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </button>
            </div>
        
            <div className='grid grid-cols-2'>
                <Card>
                    <CardHeader>
                        <CardTitle>Track Info</CardTitle>
                        <CardDescription>Info about the race event</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <dl>
                            <dt>Track Name</dt>
                            <dd>{trackName}</dd>
                            <dt>Track Length</dt>
                            <dd>{trackLength}</dd>
                            <dt>Number of Turns</dt>
                            <dd>{trackNumTurns}</dd>
                            <dt>Country</dt>
                            <dd>{trackCountry}</dd>
                            <dt>Track Location</dt>
                            <dd>{trackCity}{trackState ?  `, ${trackState}` : ``}</dd>
                        </dl>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Weather</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl>
                            <dt>Conditions</dt>
                            <dd>{skies}</dd>
                            <dt>Air Temp | Track Temp</dt>
                            <dd>{airTemp} | {trackTemp}</dd>
                            <dt>Wind Info</dt>
                        </dl>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default Spectate;