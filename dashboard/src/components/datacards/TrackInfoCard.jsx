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
    rawSessionFlags,
    sections,
    hasSectionWarning,
    sectionSummary,

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
                            className={`flex items-center justify-between rounded-t-xl px-2 py-2 ${
                                hasSectionWarning
                                    ? 'bg-yellow-400 text-black'
                                    : (flagsClassName ?? 'bg-gray-500 text-white')
                            }`}
                        >
                            <CardTitle className="flex items-center gap-1">
                                {hasSectionWarning && <span aria-hidden="true">⚠</span>}
                                <span>{hasSectionWarning ? 'LOCAL YELLOW' : (flagsText ?? 'TRACK CLEAR')}</span>
                            </CardTitle>
                            <span className="text-xs font-normal opacity-80">
                                FLAGS: {rawSessionFlags ?? '—'}
                            </span>
                        </CardHeader>
                        <CardContent className="px-2 py-2">
                            <p className="text-sm text-muted-foreground">
                                {hasSectionWarning ? sectionSummary : 'No active warnings'}
                            </p>
                        </CardContent>
                        {sections?.length > 0 && (
                            <div
                                className="grid border-t"
                                style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}
                            >
                                {sections.map((section) => (
                                    <div
                                        key={section.label}
                                        className={`border-r px-2 py-2 text-center last:border-r-0 ${
                                            section.status === 'yellow'
                                                ? 'bg-yellow-400 text-black'
                                                : 'bg-green-600/10 text-muted-foreground'
                                        }`}
                                    >
                                        <div className="text-[10px] font-semibold tracking-wide">
                                            {section.label}
                                        </div>
                                        <div className="text-xs font-bold uppercase">
                                            {section.status}
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
