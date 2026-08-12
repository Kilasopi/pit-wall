import { NavBar } from '@/components/NavBar';
import { useRaceEvents } from '@/hooks/useRaceEvents';
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

function Schedule() {
    const series = useRaceEvents();

    const [timezone, setTimezone] = useTimezone();

    return(
        <div className='min-h-screen bg-background p-6 text-foreground'>
            <div className="mb-2 flex items-center justify-between">
                <h1 className="text-xl font-heading font-medium">Team M.U.R.D.E.R</h1>
            </div>
            <NavBar />
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
            <h1 className='mb-4 text-2xl font-bold'>Schedule</h1>
            {series.map((s) => (
                <Card key={s.id} className="mb-4">
                    <CardHeader>
                        <CardTitle>{s.name}</CardTitle>
                        <CardDescription>{s.events.length} upcoming events</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {s.events.map((event) => {
                            const firstDate = event.timeslots?.[0]
                                ? new Date(event.timeslots[0]).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                })
                                : null;
                            return(
                                <Card key = {event.name}>
                                    <CardContent>
                                        <p className="font-medium">
                                            {event.name} - {firstDate}
                                        </p>
                                        <p>{event.track}</p>
                                        <p>{Math.floor(event.length_minutes / 60)}h {event.length_minutes % 60}m</p>
                                        <div className="mt-1 flex flex-wrap gap-2">
                                            {event.timeslots.map((t) => (
                                                <span key={t} className="text-sm text-muted-foreground">
                                                    {formatInTimezone(t, timezone, {
                                                        weekday: 'short',
                                                        hour: 'numeric',
                                                        minute: '2-digit',
                                                        timeZoneName: 'short',
                                                    })}
                                                </span>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

export default Schedule;