import { MapPin } from 'lucide-react';

import { 
    radiansToCompass,
    convertSessionState
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
    Length,
    NumTurns,
    PitLaneSpeedLimit,

    SessionTimeRem,

    sessionState,
    flagsText,
    flagsClassName,

    skies,
    skiesIcon: SkiesIcon,
    airTemp,
    trackTemp,
    humidity,
    windSpeed,
    windDirection,
    precipitation,
}) {
    return (
        <div className="space-y-4">
            {flagsText && (
                <div
                    className={`w-full rounded-md px-4 py-2 text-center font-bold tracking-wide ${flagsClassName ?? 'bg-gray-500 text-white'}`}
                >
                    {flagsText}
                </div>
            )}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    <MapPin className="size-4" />
                        <span>{TrackName ?? "—"}</span>
                        <span>|</span>

                        <span>
                            {convertSessionState(sessionState) ?? "—"}
                        </span>

                        <span>|</span>

                        <span>
                            {SessionTimeRem ?? "—"} REMAINING
                        </span>

                        <span>|</span>

                        {SkiesIcon && (
                            <SkiesIcon className="size-5" />
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    Track Overview
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                Length: {Length ?? '—'} |
                                Turns: {NumTurns ?? '—'} |
                                Pit Lane Speed Limit: {PitLaneSpeedLimit ?? '—'} km/h
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
                                Skies: {skies ?? '—'} <br />
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
                    <Card>
                        <CardHeader>
                            <CardTitle>CAUTION STRIP</CardTitle>
                        </CardHeader>
                        <CardContent>
                            TO BE MADE
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>
        </div>
    );
}
