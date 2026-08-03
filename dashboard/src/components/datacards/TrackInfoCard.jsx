import { MapPin } from 'lucide-react';

import { 
    convertSkies,
    radiansToCompass
} from '@/hooks/convertTrackInfoData';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

export function TrackInfoCard({
    TrackName,
    skies,
    airTemp,
    trackTemp,
    humidity,
    windSpeed,
    windDirection,
    precipitation,
}) {
    return (
        <div className="space-y-4">
            <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <MapPin className="size-4" />
                Track: {TrackName ?? '—'}
                </CardTitle>
                <CardDescription>No session data yet</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                Track info goes here.
                </p>
            </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    Track Conditions
                    </CardTitle>
                    <CardDescription>Current track conditions</CardDescription>
                </CardHeader>
                <CardContent>
                    Skies: {convertSkies(skies)} <br />
                    Air Temp: {airTemp ?? '—'} °C <br />
                    Track Temp: {trackTemp ?? '—'} °C <br />
                    Humidity: {humidity ?? '—'} % <br />
                    Wind Speed: {windSpeed ?? '—'} km/h <br />
                    Wind Direction: {radiansToCompass(windDirection).direction ?? '—'} <br />
                    Wind Degrees: {radiansToCompass(windDirection).degrees.toFixed(1) ?? '—'} ° <br />
                    Precipitation: {precipitation ?? '—'} % <br />
                </CardContent>
            </Card>
        </div>
    );
}
