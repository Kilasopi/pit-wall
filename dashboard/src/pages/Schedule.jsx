import { useState } from 'react';
import { NavBar } from '@/components/NavBar';
import { useRaceEvents } from '@/hooks/useRaceEvents';
import { useSpecialEvents } from '@/hooks/useSpecialEvents';
import { useTimezone, formatInTimezone, COMMON_TIMEZONES, getUtcOffsetLabel } from '@/hooks/useTimeZone';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

function isUpcoming(event) {
    const now = new Date();
    return event.timeslots.some((t) => new Date(t) >= now);
}

function earliestTimeslot(event) {
    return Math.min(...event.timeslots.map((t) => new Date(t).getTime()));
}

function seriesEarliestTimeslot(s) {
    const upcoming = s.events.filter(isUpcoming);
    if (upcoming.length === 0) return Infinity;
    return Math.min(...upcoming.map(earliestTimeslot));
}

function ordinalSuffix(day) {
    if (day % 10 === 1 && day % 100 !== 11) return 'st';
    if (day % 10 === 2 && day % 100 !== 12) return 'nd';
    if (day % 10 === 3 && day % 100 !== 13) return 'rd';
    return 'th';
}

function Schedule() {
    const series = useRaceEvents();
    const specialEvents = useSpecialEvents();

    const [timezone, setTimezone] = useTimezone();
    const [viewMode, setViewMode] = useState('Series');

    const sortedSeries = [...series].sort((a, b) => seriesEarliestTimeslot(a) - seriesEarliestTimeslot(b));

    const sortedSpecialEvents = [...specialEvents].sort((a, b) => {
        if (!a.dateRange) return 1;
        if (!b.dateRange) return -1;
        return new Date(a.dateRange.start) - new Date(b.dateRange.start);
    });

    const allUpcomingEvents = series
        .flatMap((s) => s.events.filter(isUpcoming).map((event) => ({ ...event, seriesName: s.name })))
        .sort((a, b) => earliestTimeslot(a) - earliestTimeslot(b));

    return(
        <div className='min-h-screen bg-background p-6 text-foreground'>
            <div className="mb-2 flex items-center justify-between">
                <h1 className="text-xl font-heading font-medium">Team M.U.R.D.E.R</h1>
            </div>
            <NavBar />
            <div className="mb-2">
                <Label className="mb-1 block text-sm text-muted-foreground">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                        {COMMON_TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                                {tz.replace('_', ' ')} ({getUtcOffsetLabel(tz)})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="mb-4">
                <Label className="mb-1 block text-sm text-muted-foreground">Order By</Label>
                <Select value={viewMode} onValueChange={setViewMode}>
                    <SelectTrigger className="w-64">
                        <SelectValue placeholder="Group by…" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Start Date">Start Date</SelectItem>
                        <SelectItem value="Series">Series</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid items-start gap-6 md:grid-cols-2">
                <div>
                    <h1 className='mb-4 text-2xl font-bold'>iRacing Scheduled Events Calendar</h1>
                    {viewMode === 'Series' && sortedSeries.map((s) => {
                        const upcomingEvents = s.events.filter(isUpcoming).sort((a, b) => earliestTimeslot(a) - earliestTimeslot(b));
                        return (
                            <Card key={s.id} className="mb-4">
                                <CardHeader>
                                    <CardTitle>{s.name}</CardTitle>
                                    <CardDescription>{upcomingEvents.length} upcoming events</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {upcomingEvents.map((event) => {
                                        const firstDate = event.timeslots?.[0]
                                            ? new Date(event.timeslots[0]).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                            })
                                            : null;
                                        return (
                                            <Card key={event.name} className="mb-2">
                                                <CardContent>
                                                    <p className="font-medium">
                                                        {event.name} - {firstDate}
                                                    </p>
                                                    <p>Location: {event.track}</p>
                                                    <p>Length: {Math.floor(event.length_minutes / 60)}h{event.length_minutes % 60 !== 0 && ` ${event.length_minutes % 60}m`}</p>
                                                    <div className="mt-1 flex flex-wrap gap-y-0">
                                                        <span className="text-sm text-muted-foreground">Timeslots: </span>
                                                        {event.timeslots.map((t, i) => {
                                                            const weekday = formatInTimezone(t, timezone, { weekday: 'short' });
                                                            const day = Number(formatInTimezone(t, timezone, { day: 'numeric' }));
                                                            const time = formatInTimezone(t, timezone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

                                                            return (
                                                                <span key={t} className="text-sm text-muted-foreground">
                                                                     {weekday} {day}{ordinalSuffix(day)}, {time}
                                                                    {i < event.timeslots.length - 1 ? ' | ' : ''}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        );
                    })}
                    {viewMode === 'Start Date' && allUpcomingEvents.map((event) => {
                        const firstDate = event.timeslots?.[0]
                            ? new Date(event.timeslots[0]).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                            })
                            : null;
                        return (
                            <Card key={`${event.seriesName}-${event.name}`} className="mb-2">
                                <CardContent>
                                    <p className="font-heading text-base leading-snug font-medium mb-1">{event.seriesName}</p>
                                    <p className="font-medium">
                                        {event.name} - {firstDate}
                                    </p>
                                    <p>Location: {event.track}</p>
                                    <p>Length: {Math.floor(event.length_minutes / 60)}h{event.length_minutes % 60 !== 0 && ` ${event.length_minutes % 60}m`}</p>
                                    <div className="mt-1 flex flex-wrap gap-y-0">
                                        <span className="text-sm text-muted-foreground">Timeslots: </span>
                                        {event.timeslots.map((t, i) => {
                                            const weekday = formatInTimezone(t, timezone, { weekday: 'short' });
                                            const day = Number(formatInTimezone(t, timezone, { day: 'numeric' }));
                                            const time = formatInTimezone(t, timezone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

                                            return (
                                                <span key={t} className="text-sm text-muted-foreground">
                                                     {weekday} {day}{ordinalSuffix(day)}, {time}
                                                    {i < event.timeslots.length - 1 ? ' | ' : ''}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <div>
                    <h2 className="mb-4 text-2xl font-bold">iRacing Special Events Calendar</h2>
                    {sortedSpecialEvents.map((event) => (
                        <Card key={event.name} className="mb-2 border-blue-500 bg-blue-950/20">
                            <CardContent>
                                <p className="font-medium">
                                    {event.name}
                                    {event.dateRange && (
                                        <span className="ml-2 text-sm text-muted-foreground">
                                            {new Date(event.dateRange.start).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                timeZone: 'UTC',
                                            })}
                                            {event.dateRange.end && event.dateRange.end !== event.dateRange.start && (
                                                <>
                                                    {' – '}
                                                    {new Date(event.dateRange.end).toLocaleDateString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        timeZone: 'UTC',
                                                    })}
                                                </>
                                            )}
                                        </span>
                                    )}
                                </p>
                                {event.distanceKm && <p>Distance: {event.distanceKm}km</p>}
                                {event.lengthMinutes && (
                                    <p>
                                        Length: {Math.floor(event.lengthMinutes / 60)}h{event.lengthMinutes % 60 !== 0 && ` ${event.lengthMinutes % 60}m`}
                                    </p>
                                )}
                                {event.timeslots.length > 0 && (
                                    <div className='mt-1 flex flex-wrap gap-y-0'>
                                        <span className="text-sm text-muted-foreground">Timeslots: </span>
                                        {event.timeslots.map((t, i) => {
                                            const weekday = formatInTimezone(t, timezone, { weekday: 'short' });
                                            const day = Number(formatInTimezone(t, timezone, { day: 'numeric' }));
                                            const time = formatInTimezone(t, timezone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

                                            return (
                                                <span key={t} className='text-sm text-muted-foreground'>
                                                     {weekday} {day}{ordinalSuffix(day)}, {time}
                                                    {i < event.timeslots.length - 1 ? ' | ' : ''}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default Schedule;