import { useState } from 'react';
import { CircleQuestionMark } from 'lucide-react';
import { NavBar } from '@/components/NavBar';
import { useRaceEvents } from '@/hooks/useRaceEvents';
import { useSpecialEvents } from '@/hooks/useSpecialEvents';
import { useTimezone, formatInTimezone, COMMON_TIMEZONES, getUtcOffsetLabel } from '@/hooks/useTimeZone';
import { EventSignups } from '@/components/EventSignups';

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
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';

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

function startOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function weekHighlightClass(dateValue) {
    if (!dateValue) return '';

    const date = new Date(dateValue);
    const thisWeekStart = startOfWeek(new Date());
    const nextWeekStart = new Date(thisWeekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    const weekAfterStart = new Date(nextWeekStart);
    weekAfterStart.setDate(weekAfterStart.getDate() + 7);

    if (date >= thisWeekStart && date < nextWeekStart) return 'border border-purple-700 bg-purple-950/40';
    if (date >= nextWeekStart && date < weekAfterStart) return 'border border-amber-600 bg-yellow-950/40';
    return '';
}

function isThisOrNextWeek(dateValue) {
    return weekHighlightClass(dateValue) !== '';
}

function Schedule() {
    const series = useRaceEvents();
    const specialEvents = useSpecialEvents();

    const [timezone, setTimezone] = useTimezone();
    const [showLegend, setShowLegend] = useState(false);
    const [onlyHighlighted, setOnlyHighlighted] = useState(false);

    const sortedSeries = [...series].sort((a, b) => seriesEarliestTimeslot(a) - seriesEarliestTimeslot(b));

    const sortedSpecialEvents = [...specialEvents].sort((a, b) => {
        if (!a.dateRange) return 1;
        if (!b.dateRange) return -1;
        return new Date(a.dateRange.start) - new Date(b.dateRange.start);
    });

    return(
        <div className='min-h-screen bg-background p-6 text-foreground'>
            <div className="mb-2 flex items-center justify-between">
                <h1 className="text-xl font-heading font-medium">Team M.U.R.D.E.R</h1>
            </div>
            <NavBar />
            <div className="relative mb-4 flex items-end justify-between gap-2">
                <div>
                    <Label className="mb-1 block text-base text-muted-foreground">Timezone</Label>
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
                <div className="flex items-center gap-2">
                    <Toggle
                        variant="outline"
                        size="sm"
                        pressed={onlyHighlighted}
                        onPressedChange={setOnlyHighlighted}
                    >
                        This & Next Week
                    </Toggle>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setShowLegend((v) => !v)}
                        aria-label="What do the highlight colors mean?"
                    >
                        <CircleQuestionMark className="size-4" />
                    </Button>
                    {showLegend && (
                        <div className="absolute top-full right-0 z-10 mt-2 flex w-64 flex-col gap-1 rounded-md border bg-popover p-3 text-sm text-popover-foreground shadow-md">
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-sm border border-purple-700 bg-purple-950/40" />
                                <span>Events Happening This Week</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-sm border border-amber-600 bg-yellow-950/40" />
                                <span>Events Happening Next Week</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-sm border border-blue-500 bg-blue-950/40" />
                                <span>Special Events</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="grid items-start gap-6 md:grid-cols-2">
                <div>
                    <h1 className='mb-4 text-2xl font-bold'>iRacing Scheduled Events Calendar</h1>
                    {sortedSeries.map((s) => {
                        let upcomingEvents = s.events.filter(isUpcoming).sort((a, b) => earliestTimeslot(a) - earliestTimeslot(b));
                        if (onlyHighlighted) {
                            upcomingEvents = upcomingEvents.filter((event) => isThisOrNextWeek(event.timeslots?.[0]));
                        }
                        if (upcomingEvents.length === 0) return null;
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
                                            <Card key={event.name} className={`mb-2 ${weekHighlightClass(event.timeslots?.[0])}`}>
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
                                                    <EventSignups raceEventId={event.id} carClasses={s.car_classes} />
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <div>
                    <h2 className="mb-4 text-2xl font-bold">iRacing Special Events Calendar</h2>
                    <Card>
                        <CardContent>
                            {sortedSpecialEvents
                                .map((event) => {
                            const highlight = weekHighlightClass(event.timeslots?.[0] ?? event.dateRange?.start);
                            return (
                            <Card key={event.name} className={`mb-2 ${highlight || 'bg-blue-950/40'}`}>
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
                                    <EventSignups raceEventId={event.id} carClasses={event.carClasses} />
                                </CardContent>
                            </Card>
                            );
                        })}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

export default Schedule;