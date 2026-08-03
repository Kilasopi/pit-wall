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
    City,
    State,
    Country,
    Altitude,
    TrackType,
    Direction,
    NumPitStalls,
    PaceSpeed,
    DynamicTrack,

    SessionTimeRem,

    sessionState,
    flagsText,
    flagsClassName,
    sections,
    cautionText,
    cautionClassName,

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
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
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

                            {flagsText && (
                                <>
                                    <span>|</span>
                                    <span
                                        className={`rounded px-2 py-0.5 text-xs font-bold tracking-wide ${flagsClassName ?? 'bg-gray-500 text-white'}`}
                                    >
                                        {flagsText}
                                    </span>
                                </>
                            )}
                        </div>

                        {SkiesIcon && (
                            <SkiesIcon className="size-5 shrink-0" />
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
                                Location: {City ?? '—'}{State ? `, ${State}` : ''}, {Country ?? '—'} <br />
                                Length: {Length ?? '—'} <br />
                                Turns: {NumTurns ?? '—'} <br />
                                Type: {TrackType ?? '—'} <br />
                                Direction: {Direction ?? '—'} <br />
                                Altitude: {Altitude ?? '—'} <br />
                                Pit Lane Speed Limit: {PitLaneSpeedLimit ?? '—'} km/h <br />
                                Pit Stalls: {NumPitStalls ?? '—'} <br />
                                Pace Speed: {PaceSpeed ?? '—'} <br />
                                Dynamic Track: {DynamicTrack ?? '—'}
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
                    <Card className="overflow-hidden py-0 gap-0">
                        <CardHeader
                            className={`flex flex-col gap-1 rounded-t-xl px-2 py-2 ${
                                cautionClassName ?? 'bg-gray-500 text-white'
                            }`}
                        >
                            <CardTitle className="flex items-center gap-1">
                                {cautionText !== 'TRACK CLEAR' && <span aria-hidden="true">⚠</span>}
                                <span>{cautionText ?? 'TRACK CLEAR'}</span>
                            </CardTitle>
                            <CardDescription className="text-[10px] opacity-80">
                                Inferred from timing sections, car positions and per-car flags.
                            </CardDescription>
                        </CardHeader>
                        {sections?.length > 0 && (
                            <div
                                className="grid border-t"
                                style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}
                            >
                                {sections.map((section) => (
                                    <div
                                        key={section.section}
                                        className={`border-r px-2 py-2 text-center last:border-r-0 ${
                                            section.status === 'clear'
                                                ? 'bg-green-600/10 text-muted-foreground'
                                                : 'bg-yellow-400 text-black'
                                        }`}
                                    >
                                        <div className="text-[10px] font-semibold tracking-wide">
                                            SECTION {section.section}
                                        </div>
                                        <div className="text-xs font-bold uppercase">
                                            {section.status === 'clear'
                                                ? 'CLEAR'
                                                : section.status === 'waving'
                                                  ? 'WAVING YELLOW'
                                                  : 'YELLOW'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </CardContent>
            </Card>
        </div>
    );
}
