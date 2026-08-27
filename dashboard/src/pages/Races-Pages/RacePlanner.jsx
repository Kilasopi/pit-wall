import { useState } from 'react';
import { useParams, Link } from "react-router-dom";
import { useRaceEventTeams } from "@/hooks/useRaceEventTeams";
import { useDrivers } from '@/hooks/useDrivers';
import { RELAY_HTTP_URL } from '@/lib/relay';
import { useAuth } from '@/hooks/useAuth';
import { X } from 'lucide-react';
import { useRaceEventCarClasses } from '@/hooks/useRaceEventCarClasses';
import { useTimezone, formatInTimezone, getUtcOffsetLabel, getTimeZoneAbbreviation, ordinalSuffix, zonedTimeToUtcIso } from '@/hooks/useTimeZone';
import { useRaceEventSignups } from '@/hooks/useRaceEventSignups';


import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { classifyCarName } from '@/components/RaceEventSignupForm';
import { classColor } from '@/lib/carClasses';
import { HelpPopover } from '@/components/HelpPopover';
import { toast } from 'sonner';

function CarVoteSelect({ carClass, carOptions, onSubmit }) {
    const [value, setValue] = useState('');
    const options = carOptions.filter((name) => classifyCarName(name) === carClass);

    return (
        <div className="flex items-center gap-1">
            <Select value={value} onValueChange={setValue}>
                <SelectTrigger className="h-7 w-40">
                    <SelectValue placeholder="Pick car">{(v) => v || null}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {options.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button variant="dark" size="sm" className="border-murder-fuchsia" disabled={!value} onClick={() => { onSubmit(value); setValue(''); }}>
                Vote
            </Button>
        </div>
    );
}

function TimeslotVoteSelect({ options, onSubmit }) {
    const [value, setValue] = useState('');

    return (
        <div className="flex items-center gap-1">
            <Select value={value} onValueChange={setValue}>
                <SelectTrigger className="h-7 w-56">
                    <SelectValue placeholder="Add availability">
                        {(v) => options.find((opt) => String(opt.id) === v)?.slotLabel ?? null}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {options.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>{opt.slotLabel}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button
                variant="dark"
                size="sm"
                disabled={!value}
                onClick={() => { onSubmit(Number(value)); setValue(''); }}
                className="border-murder-cyan"
            >
                Vote
            </Button>
        </div>
    );
}

function dayOptionsInWindow(window, timezone) {
    if (!window) return [];
    const days = [];
    const cursor = new Date(window.start);
    cursor.setUTCHours(0, 0, 0, 0);
    while (cursor <= window.end) {
        const label = new Intl.DateTimeFormat(undefined, { timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric' }).format(cursor);
        const value = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(cursor);
        days.push({ value, label });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return [...new Map(days.map((d) => [d.value, d])).values()];
}

function isoToDayAndTime(iso, timezone) {
    const date = new Date(iso);
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
    return { day, time };
}

function AvailabilityBlockForm({ driverTimezone, window, onSubmit }) {
    const [open, setOpen] = useState(false);
    const [day, setDay] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [severity, setSeverity] = useState('blackout');
    const [reason, setReason] = useState('');
    const tz = driverTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const days = dayOptionsInWindow(window, tz);

    function submit() {
        if (!day || !startTime || !endTime) return;
        const startIso = zonedTimeToUtcIso(`${day}T${startTime}`, tz);
        const endDay = endTime < startTime
            ? new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
                .format(new Date(new Date(`${day}T00:00:00`).getTime() + 24 * 3600000))
            : day;
        const endIso = zonedTimeToUtcIso(`${endDay}T${endTime}`, tz);
        if (window && (new Date(startIso) < window.start || new Date(endIso) > window.end)) {
            alert('That falls outside the race weekend window.');
            return;
        }
        onSubmit({ startAt: startIso, endAt: endIso, severity, reason });
        setDay(''); setStartTime(''); setEndTime(''); setReason(''); setOpen(false);
    }

    if (!open) {
        return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>+ Add Blackout</Button>;
    }

    return (
        <div className="flex flex-col gap-2 rounded-lg border border-input p-2">
            <div className="flex gap-2">
                <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Date ({getTimeZoneAbbreviation(tz)} {getUtcOffsetLabel(tz)})</label>
                    <Select value={day} onValueChange={setDay}>
                        <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Pick day" /></SelectTrigger>
                        <SelectContent>
                            {days.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Start Time:</label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-8 w-36" />
                </div>
                <div>
                    <label className="mb-1 block text-xs text-muted-foreground">End Time:</label>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-8 w-36" />
                </div>
            </div>
            <div className="flex gap-2">
                <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger className="h-8 w-36">
                        <SelectValue>{severity === 'blackout' ? 'Blackout' : 'Prefer to avoid'}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="blackout">Blackout</SelectItem>
                        <SelectItem value="avoid">Prefer to avoid</SelectItem>
                    </SelectContent>
                </Select>
                <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} className="h-8 flex-1" />
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="dark" size="sm" disabled={!day || !startTime || !endTime} onClick={submit} className="border-murder-pink-dark">Add</Button>
            </div>
        </div>
    );
}

function AvailabilityBlockBadge({ block, driverTimezone, window, onSave, onRemove }) {
    const [editing, setEditing] = useState(false);
    const tz = driverTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const startParts = isoToDayAndTime(block.start_at, tz);
    const endParts = isoToDayAndTime(block.end_at, tz);
    const [day, setDay] = useState(startParts.day);
    const [startTime, setStartTime] = useState(startParts.time);
    const [endTime, setEndTime] = useState(endParts.time);
    const [severity, setSeverity] = useState(block.severity);
    const [reason, setReason] = useState(block.reason ?? '');
    const days = dayOptionsInWindow(window, tz);

    function save() {
        if (!day || !startTime || !endTime) return;
        const startIso = zonedTimeToUtcIso(`${day}T${startTime}`, tz);
        const endDay = endTime < startTime
            ? new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
                .format(new Date(new Date(`${day}T00:00:00`).getTime() + 24 * 3600000))
            : day;
        const endIso = zonedTimeToUtcIso(`${endDay}T${endTime}`, tz);
        if (window && (new Date(startIso) < window.start || new Date(endIso) > window.end)) {
            alert('That falls outside the race weekend window.');
            return;
        }
        onSave({ startAt: startIso, endAt: endIso, severity, reason });
        setEditing(false);
    }

    if (!editing) {
        return (
            <Badge
                variant="secondary"
                className={`cursor-pointer gap-1 ${block.severity === 'blackout' ? 'border-destructive text-destructive' : 'border-murder-yellow text-murder-yellow-dark'}`}
                onClick={() => setEditing(true)}
            >
                {block.severity === 'blackout' ? 'Blackout' : 'Avoid'}: {formatInTimezone(block.start_at, 'UTC', { dateStyle: 'short', timeStyle: 'short' })}–{formatInTimezone(block.end_at, 'UTC', { dateStyle: 'short', timeStyle: 'short' })} UTC
                {' / '}
                {formatInTimezone(block.start_at, tz, { dateStyle: 'short', timeStyle: 'short' })}–{formatInTimezone(block.end_at, tz, { dateStyle: 'short', timeStyle: 'short' })} {getTimeZoneAbbreviation(tz)} ({getUtcOffsetLabel(tz)})
                {block.reason && ` (${block.reason})`}
                <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
                    <X className="size-3.5" />
                </Button>
            </Badge>
        );
    }

    return (
        <div className="flex flex-col gap-2 rounded-lg border border-input p-2">
            <div className="flex gap-2">
                <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Date ({getTimeZoneAbbreviation(tz)} {getUtcOffsetLabel(tz)})</label>
                    <Select value={day} onValueChange={setDay}>
                        <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Pick day" /></SelectTrigger>
                        <SelectContent>
                            {days.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Start Time:</label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-8 w-36" />
                </div>
                <div>
                    <label className="mb-1 block text-xs text-muted-foreground">End Time:</label>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-8 w-36" />
                </div>
            </div>
            <div className="flex gap-2">
                <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger className="h-8 w-36">
                        <SelectValue>{severity === 'blackout' ? 'Blackout' : 'Prefer to avoid'}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="blackout">Blackout</SelectItem>
                        <SelectItem value="avoid">Prefer to avoid</SelectItem>
                    </SelectContent>
                </Select>
                <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} className="h-8 flex-1" />
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                <Button variant="dark" size="sm" onClick={save} className="border-murder-pink-dark">Save</Button>
            </div>
        </div>
    );
}

function offsetMinutes(tz) {
    const match = getUtcOffsetLabel(tz).match(/GMT([+-])(\d+)(?::(\d+))?/);
    if (!match) return 0;
    const sign = match[1] === '-' ? -1 : 1;
    const hours = Number(match[2]);
    const mins = match[3] ? Number(match[3]) : 0;
    return sign * (hours * 60 + mins);
}

function timeslotLabel(startAt, driverTimezone, viewerTimezone) {
    const sameTz = driverTimezone && viewerTimezone && driverTimezone === viewerTimezone;
    const parts = [];

    if (driverTimezone) {
        parts.push(`${formatInTimezone(startAt, driverTimezone, { dateStyle: 'full', timeStyle: 'short' })} ${getUtcOffsetLabel(driverTimezone)}`);
    }
    parts.push(`${formatInTimezone(startAt, 'UTC', { dateStyle: 'full', timeStyle: 'short' })} UTC`);
    if (!sameTz && viewerTimezone) {
        parts.push(`${formatInTimezone(startAt, viewerTimezone, { dateStyle: 'full', timeStyle: 'short' })} ${getUtcOffsetLabel(viewerTimezone)}`);
    }

    return parts.join(' | ');
}

function RacePlanner() {
    const { token } = useAuth();
    const { raceEventId } = useParams();
    const { teams, unassigned, timeslots, refetch } = useRaceEventTeams(raceEventId);
    const { data: registeredRaces } = useDrivers('registered-races');
    const raceInfo = registeredRaces.find((r) => String(r.race_event_id) === raceEventId);
    const carClasses = useRaceEventCarClasses(raceEventId);
    const { signups } = useRaceEventSignups(raceEventId);

    const raceLengthMinutes = raceInfo?.length_minutes ?? 0;
    const availabilityWindow = timeslots.length > 0 ? {
        start: new Date(Math.min(...timeslots.map((t) => new Date(t.start_at).getTime())) - 6 * 3600000),
        end: new Date(Math.max(...timeslots.map((t) => new Date(t.start_at).getTime())) + raceLengthMinutes * 60000 + 6 * 3600000),
    } : null;

    const [viewerTimezone] = useTimezone('racePlanner', 'UTC');

    function leaveTeam(signupId) {
        fetch(`${RELAY_HTTP_URL}/api/team-members/${signupId}`, { method: 'DELETE' }).then(refetch);
    }

    function joinTeam(teamId, signupId) {
        fetch(`${RELAY_HTTP_URL}/api/teams/${teamId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signupId }),
        }).then(refetch);
    }

    function deleteTeam(teamId, teamName) {
        if (!confirm(`Delete ${teamName}? This can't be undone — all members will need to rejoin or form a new team.`)) return;
        setDeletingTeamId(teamId);
        fetch(`${RELAY_HTTP_URL}/api/teams/${teamId}`, { method: 'DELETE' })
            .then(refetch)
            .then(() => toast.success(`${teamName} deleted`))
            .catch(() => toast.error(`Failed to delete ${teamName}`))
            .finally(() => setDeletingTeamId(null));
    }

    function addTimeslotVote(timeslotId, signupId) {
        fetch(`${RELAY_HTTP_URL}/api/timeslots/${timeslotId}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ signupId }),
        }).then(refetch);
    }

    function removeTimeslotVote(timeslotId, signupId) {
        fetch(`${RELAY_HTTP_URL}/api/timeslots/${timeslotId}/vote/${signupId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        }).then(refetch);
    }

    function castCarVote(teamId, signupId, carName) {
        if (!carName.trim()) return;
        fetch(`${RELAY_HTTP_URL}/api/teams/${teamId}/car-votes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ signupId, carName: carName.trim() }),
        }).then(refetch);
    }

    function clearCarVote(teamId, signupId, carName) {
        fetch(`${RELAY_HTTP_URL}/api/teams/${teamId}/car-votes/${signupId}/${encodeURIComponent(carName)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        }).then(refetch);
    }

    function addAvailabilityBlock(signupId, block) {
        fetch(`${RELAY_HTTP_URL}/api/signups/${signupId}/availability-blocks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(block),
        }).then(refetch);
    }

    function removeAvailabilityBlock(blockId) {
        fetch(`${RELAY_HTTP_URL}/api/availability-blocks/${blockId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        }).then(refetch);
    }

    function updateAvailabilityBlock(blockId, patch) {
        fetch(`${RELAY_HTTP_URL}/api/availability-blocks/${blockId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(patch),
        }).then(refetch);
    }

    function lockCar(teamId, carName) {
        fetch(`${RELAY_HTTP_URL}/api/teams/${teamId}/lock-car`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ carName }),
        }).then(refetch);
    }

    function lockTimeslot(teamId, timeslotId) {
        fetch(`${RELAY_HTTP_URL}/api/teams/${teamId}/lock-timeslot`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ timeslotId }),
        }).then(refetch);
    }

    function unlockCar(teamId) {
        fetch(`${RELAY_HTTP_URL}/api/teams/${teamId}/lock-car`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        }).then(refetch);
    }

    function unlockTimeslot(teamId) {
        fetch(`${RELAY_HTTP_URL}/api/teams/${teamId}/lock-timeslot`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        }).then(refetch);
    }

    function tallyCarVotes(team) {
        const counts = new Map();
        for (const v of team.carVotes ?? []) {
            counts.set(v.car_name, (counts.get(v.car_name) ?? 0) + 1);
        }
        return [...counts.entries()].map(([carName, count]) => ({ carName, count }));
    }

    function tallyTimeslotVotes(team, timeslots) {
        return timeslots.map((ts) => ({
            timeslotId: ts.id,
            count: (team.votes[ts.id] ?? []).length,
        }));
    }

    function groupUnassignedByDriver(rows) {
        const groups = new Map();
        for (const u of rows) {
            const key = u.driver_id ? `driver:${u.driver_id}` : `guest:${u.guest_name}`;
            if (!groups.has(key)) {
                groups.set(key, { name: u.driver_name || u.guest_name, signups: [] });
            }
            groups.get(key).signups.push(u);
        }
        return [...groups.values()];
    }

    const [newTeamClass, setNewTeamClass] = useState('');
    const [newTeamName, setNewTeamName] = useState('');
    const [creatingTeam, setCreatingTeam] = useState(false);
    const [deletingTeamId, setDeletingTeamId] = useState(null);
    const availableClasses = [...new Set([...unassigned.map((u) => u.car_class), ...teams.map((t) => t.car_class)])];

    function createTeam() {
        if (!newTeamClass || !newTeamName.trim()) return;
        setCreatingTeam(true);
        fetch(`${RELAY_HTTP_URL}/api/race-events/${raceEventId}/teams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ carClass: newTeamClass, name: newTeamName.trim() }),
        }).then(() => {
            setNewTeamName('');
            refetch();
            toast.success(`${newTeamName.trim()} created`);
        }).catch(() => toast.error('Failed to create team'))
        .finally(() => setCreatingTeam(false));
    }

    return(
        <div>
            <Link to="/races">
                <Button variant="outline" size="sm" className="mb-4">← Back to Races</Button>
            </Link>
            <div className="mb-4">
                <h1 className="text-xl font-heading font-medium">{raceInfo?.event_name}</h1>
                <p className="text-sm text-muted-foreground">
                    {raceInfo?.track}
                    {raceInfo?.distance_km && ` · ${raceInfo.distance_km}km`}
                    {raceInfo?.length_minutes && (` · ${Math.floor(raceInfo.length_minutes / 60)}h${raceInfo.length_minutes % 60 !== 0 ? ` ${raceInfo.length_minutes % 60}m` : ''}`)}
                </p>
            </div>
            <div className="grid grid-cols-[1fr_2fr] gap-4 items-start">
                <div className='grid gap-4'>
                    <Card>
                        <CardHeader>
                            <CardTitle>Race Details</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 text-sm">
                            <div>
                                <p className="font-medium text-base">{raceInfo?.event_name}</p>
                                <p className="text-muted-foreground">
                                    {raceInfo?.track}
                                    {raceInfo?.distance_km && ` · ${raceInfo.distance_km}km`}
                                    {raceInfo?.length_minutes && (` · ${Math.floor(raceInfo.length_minutes / 60)}h${raceInfo.length_minutes % 60 !== 0 ? ` ${raceInfo.length_minutes % 60}m` : ''}`)}
                                </p>
                                <p className="text-muted-foreground">
                                    {signups.length} driver{signups.length === 1 ? '' : 's'} signed up
                                </p>
                            </div>

                            <div>
                                <p className="mb-1 font-medium text-base">Cars by Class</p>
                                {[...new Set(carClasses.map((name) => classifyCarName(name)))].map((cls) => (
                                    <div key={cls} className="mb-1 flex items-start gap-2">
                                        <span
                                            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                                            style={{ backgroundColor: classColor(cls) }}
                                        />
                                        <span>
                                            <span className="text-sm font-semibold text-foreground">{cls}:</span>{' '}
                                            {carClasses.filter((name) => classifyCarName(name) === cls).join(', ')}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <p className="mb-1 font-medium text-base">Timeslots</p>
                                <div className="flex flex-col gap-2">
                                    {timeslots.map((ts, i) => {
                                        const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                                        const zones = [...new Set([
                                            viewerTimezone,
                                            localTz,
                                            ...signups.map((s) => s.driver_timezone ?? s.guest_timezone).filter(Boolean),
                                        ])].sort((a, b) => offsetMinutes(a) - offsetMinutes(b));
                                        const format = (tz) => {
                                            const weekday = formatInTimezone(ts.start_at, tz, { weekday: 'short' });
                                            const day = Number(formatInTimezone(ts.start_at, tz, { day: 'numeric' }));
                                            const time = formatInTimezone(ts.start_at, tz, { hour: 'numeric', minute: '2-digit' });
                                        return `${weekday} ${day}${ordinalSuffix(day)}, ${time} ${getTimeZoneAbbreviation(tz)} (${getUtcOffsetLabel(tz)})`;
                                        };
                                        return (
                                            <div key={ts.id} className="rounded-lg border border-input p-2">
                                                <p className="mb-1 text-sm font-medium">Slot {i + 1}</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {zones.map((tz) => (
                                                        <Badge
                                                            key={tz}
                                                            variant="secondary"
                                                            className={`text-xs font-normal ${tz === 'UTC' ? 'border-murder-fuchsia text-murder-fuchsia' : ''}`}
                                                        >
                                                            {format(tz)}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    {unassigned.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Unasigned Drivers</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {groupUnassignedByDriver(unassigned).map((driver) => (
                                    <div key={driver.signups[0].signup_id} className="flex items-center gap-2">
                                        <p>{driver.name}</p>
                                        {driver.signups.flatMap((u) =>
                                            teams.filter(t => t.car_class === u.car_class).map(t => (
                                                <Button key={t.id} variant="outline" size="sm" onClick={() => joinTeam(t.id, u.signup_id)}>
                                                    Join {t.name} ({u.car_class})
                                                </Button>
                                            ))
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Race Planner</CardTitle>
                        <CardDescription></CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 flex items-end gap-2">
                            <div>
                                <div className="flex items-center gap-1">
                                    <p className='text-base font-medium'>Create New Team Entry</p>
                                    <HelpPopover label="What does creating a team do?">
                                        <p>Creates an empty team entry for a car class — drivers then join it from the Unassigned Drivers list.</p>
                                        <p className="mt-2">Each class (GT3, GTP, etc) needs its own team; signups are matched to classes automatically once they join.</p>
                                    </HelpPopover>
                                </div>
                                <label className="mb-1 block text-sm text-muted-foreground">Car Class</label>
                                <Select value={newTeamClass} onValueChange={setNewTeamClass}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue placeholder="Select class">
                                            {(value) => value || null}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableClasses.map((cls) => (
                                            <SelectItem key={cls} value={cls}>
                                                {cls}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm text-muted-foreground">Team Name</label>
                                <Input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
                            </div>
                            <Button
                                variant="dark"
                                size="sm"
                                onClick={createTeam}
                                disabled={!newTeamClass || !newTeamName.trim() || creatingTeam}
                                className="border-rounded-lg murder-shine border-2 border-transparent bg-origin-border [background:linear-gradient(var(--card),var(--card))_padding-box,linear-gradient(to_right,var(--murder-fuchsia),var(--murder-cyan))_border-box]"
                            >
                                {creatingTeam ? 'Creating…' : 'Create Team'}
                            </Button>
                        </div>
                        {teams.length > 0 && (
                            <div className="mb-4">
                                <div className="flex flex-col divide-y divide-murder-fuchsia/30">
                                    {teams.map((t) => (
                                        <div key={t.id} className="py-6 first:pt-0 last:pb-0">
                                            <div className="mb-2 flex items-center gap-2">
                                                <p className="flex items-center gap-2 font-medium text-lg">
                                                    <span
                                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                                        style={{ backgroundColor: classColor(t.car_class) }}
                                                    />
                                                    {t.name} — {t.car_class}
                                                </p>
                                                <Link to={`/races/${raceEventId}/teams/${t.id}/stintPlanner`}>
                                                    <Button variant="outline" size="sm">Stint Planner</Button>
                                                </Link>
                                                <Button
                                                    variant="dark"
                                                    size="sm"
                                                    onClick={() => deleteTeam(t.id, t.name)}
                                                    disabled={deletingTeamId === t.id}
                                                    className='border-murder-pink-dark'
                                                >
                                                    {deletingTeamId === t.id ? 'Deleting…' : 'Delete Team'}
                                                </Button>
                                            </div>

                                            <div className="mb-3 flex flex-col gap-2">
                                                <div className="flex flex-wrap items-center gap-1">
                                                    <span className="text-xs text-muted-foreground">Car:</span>
                                                    <HelpPopover label="How does car confirmation work?">
                                                        <p>Each driver votes for a car below; the tally shows here as options to confirm.</p>
                                                        <p className="mt-2">Confirming locks it in for the team, but it can always be unlocked and re-confirmed later if plans change.</p>
                                                    </HelpPopover>
                                                    {t.locked_car_name ? (
                                                        <Badge variant="secondary" className="gap-1">
                                                            Confirmed — {t.locked_car_name}
                                                            <Button variant="ghost" size="icon-sm" onClick={() => unlockCar(t.id)}>
                                                                <X className="size-3.5" />
                                                            </Button>
                                                        </Badge>
                                                    ) : carClasses.filter((name) => classifyCarName(name) === t.car_class).length === 1 ? (
                                                        <Badge variant="secondary">
                                                            Confirmed — {carClasses.filter((name) => classifyCarName(name) === t.car_class)[0]}
                                                        </Badge>
                                                    ) : tallyCarVotes(t).length === 0 ? (
                                                        <span className="text-xs text-muted-foreground">No votes yet</span>
                                                    ) : (
                                                        tallyCarVotes(t).map(({ carName, count }) => (
                                                            <Button
                                                                key={carName}
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => lockCar(t.id, carName)}
                                                                className={count === t.members.length ? 'border-2 border-transparent bg-origin-border [background:linear-gradient(var(--card),var(--card))_padding-box,linear-gradient(to_right,var(--murder-fuchsia),var(--murder-cyan))_border-box]' : ''}
                                                            >
                                                                Confirm {carName} ({count}/{t.members.length})
                                                            </Button>
                                                        ))
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-1">
                                                    <span className="text-xs text-muted-foreground">Timeslot:</span>
                                                    <HelpPopover label="How does timeslot confirmation work?">
                                                        <p>Drivers vote for which start-time slot works for them; the tally shows here as options to confirm.</p>
                                                        <p className="mt-2">Confirming sets the team's actual race start time — still reversible with unlock if the team needs to change it.</p>
                                                    </HelpPopover>
                                                    {t.locked_timeslot_id ? (
                                                        <Badge variant="secondary">
                                                            Confirmed — Slot {timeslots.findIndex((x) => x.id === t.locked_timeslot_id) + 1}
                                                            <Button variant="ghost" size="icon-sm" onClick={() => unlockTimeslot(t.id)}>
                                                                <X className="size-3.5" />
                                                            </Button>
                                                        </Badge>
                                                    ) : tallyTimeslotVotes(t, timeslots).every(({ count }) => count === 0) ? (
                                                        <span className="text-xs text-muted-foreground">No votes yet</span>
                                                    ) : (
                                                        tallyTimeslotVotes(t, timeslots)
                                                            .filter(({ count }) => count > 0)
                                                            .map(({ timeslotId, count }) => (
                                                                <Button
                                                                    key={timeslotId}
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => lockTimeslot(t.id, timeslotId)}
                                                                    className={count === t.members.length ? 'border-2 border-transparent bg-origin-border [background:linear-gradient(var(--card),var(--card))_padding-box,linear-gradient(to_right,var(--murder-fuchsia),var(--murder-cyan))_border-box]' : ''}
                                                                >
                                                                    Confirm Slot {timeslots.findIndex((x) => x.id === timeslotId) + 1} ({count}/{t.members.length})
                                                                </Button>
                                                            ))
                                                    )}
                                                </div>
                                                {t.locked_timeslot_id && (() => {
                                                    const lockedTs = timeslots.find((x) => x.id === t.locked_timeslot_id);
                                                    if (!lockedTs) return null;
                                                    const memberZones = [...new Set(t.members.map((m) => m.timezone).filter(Boolean))];
                                                    if (memberZones.length === 0) return null;
                                                    const format = (tz) => {
                                                        const weekday = formatInTimezone(lockedTs.start_at, tz, { weekday: 'short' });
                                                        const day = Number(formatInTimezone(lockedTs.start_at, tz, { day: 'numeric' }));
                                                        const time = formatInTimezone(lockedTs.start_at, tz, { hour: 'numeric', minute: '2-digit' });
                                                        return `${weekday} ${day}${ordinalSuffix(day)}, ${time} ${getTimeZoneAbbreviation(tz)} (${getUtcOffsetLabel(tz)})`;
                                                    };
                                                    return (
                                                        <div className="flex flex-wrap gap-1">
                                                            {memberZones.map((tz) => (
                                                                <Badge key={tz} variant="secondary" className="text-xs font-normal">
                                                                    {format(tz)}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <div className="mt-3 flex flex-col divide-y divide-murder-cyan/20 border-t border-murder-cyan/20">
                                                {t.members.map((m) => {
                                                    const memberCarVotes = t.carVotes?.filter((v) => v.signup_id === m.signup_id) ?? [];
                                                    const classCarOptions = carClasses.filter((name) => classifyCarName(name) === t.car_class);
                                                    return (
                                                        <div key={m.signup_id} className="flex flex-col gap-2 py-3 last:pb-0">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-medium text-base">{m.name}</p>
                                                                    {m.timezone && (
                                                                        <Badge variant="secondary" className="text-xs">
                                                                            {getTimeZoneAbbreviation(m.timezone)} ({getUtcOffsetLabel(m.timezone)})
                                                                        </Badge>
                                                                    )}
                                                                </div>

                                                                <Button variant="dark" size="sm" onClick={() => leaveTeam(m.signup_id)} className="border-murder-violet">
                                                                    Leave Team
                                                                </Button>
                                                            </div>

                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-xs text-muted-foreground">Car</span>
                                                                    <HelpPopover label="What does voting for a car do?">
                                                                        <p>This is just an interest signal — it doesn't reserve or confirm anything by itself.</p>
                                                                        <p className="mt-2">Once enough votes are in, anyone on the team can confirm a car above, for the whole team.</p>
                                                                    </HelpPopover>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-1">
                                                                    {classCarOptions.length > 1 && (
                                                                        <CarVoteSelect
                                                                            carClass={t.car_class}
                                                                            carOptions={carClasses.filter(
                                                                                (name) => !memberCarVotes.some((v) => v.car_name === name)
                                                                            )}
                                                                            onSubmit={(carName) => castCarVote(t.id, m.signup_id, carName)}
                                                                        />
                                                                    )}
                                                                    {classCarOptions.length === 1 && (
                                                                        <span className="text-xs text-muted-foreground">
                                                                            Only car available: {classCarOptions[0]}
                                                                        </span>
                                                                    )}
                                                                    {memberCarVotes.map((v) => (
                                                                        <Badge key={v.car_name} variant="secondary" className="gap-1">
                                                                            {v.car_name}
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon-sm"
                                                                                onClick={() => clearCarVote(t.id, m.signup_id, v.car_name)}
                                                                            >
                                                                                <X className="size-3.5" />
                                                                            </Button>
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-xs text-muted-foreground">Availability</span>
                                                                    <HelpPopover label="What does voting for a timeslot do?">
                                                                        <p>This is which start-time slots this driver could make it to — also just an interest signal, not a commitment.</p>
                                                                        <p className="mt-2">This is separate from Blackout/Avoid below, which is about when a driver specifically can't or shouldn't drive.</p>
                                                                    </HelpPopover>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-1">
                                                                    <TimeslotVoteSelect
                                                                        options={timeslots
                                                                            .filter((ts) => !(t.votes[ts.id] ?? []).includes(m.signup_id))
                                                                            .map((ts) => ({
                                                                                id: ts.id,
                                                                                slotLabel: `Slot ${timeslots.findIndex((x) => x.id === ts.id) + 1}`,
                                                                            }))}
                                                                        onSubmit={(timeslotId) => addTimeslotVote(timeslotId, m.signup_id)}
                                                                    />
                                                                    {timeslots
                                                                        .filter((ts) => (t.votes[ts.id] ?? []).includes(m.signup_id))
                                                                        .map((ts) => (
                                                                            <Badge key={ts.id} variant="secondary" className="gap-1">
                                                                                Slot {timeslots.findIndex((x) => x.id === ts.id) + 1}
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon-sm"
                                                                                    onClick={() => removeTimeslotVote(ts.id, m.signup_id)}
                                                                                >
                                                                                    <X className="size-3.5" />
                                                                                </Button>
                                                                            </Badge>
                                                                        ))}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-xs text-muted-foreground">Blackout / Avoid</span>
                                                                    <HelpPopover label="What do Blackout and Avoid mean?">
                                                                        <p><strong>Blackout</strong> — the driver absolutely can't drive during this window (appointment, sleeping, etc).</p>
                                                                        <p className="mt-2"><strong>Avoid</strong> — the driver could drive, but it's not ideal (fatigue, very late for their timezone).</p>
                                                                        <p className="mt-2">Neither ever blocks scheduling — they just warn whoever's building the stint plan.</p>
                                                                    </HelpPopover>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-1">
                                                                    <AvailabilityBlockForm driverTimezone={m.timezone} window={availabilityWindow} onSubmit={(block) => addAvailabilityBlock(m.signup_id, block)} />
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-1">
                                                                    {(t.availabilityBlocks?.[m.signup_id] ?? []).map((b) => (
                                                                        <AvailabilityBlockBadge
                                                                            key={b.id}
                                                                            block={b}
                                                                            driverTimezone={m.timezone}
                                                                            window={availabilityWindow}
                                                                            onSave={(patch) => updateAvailabilityBlock(b.id, patch)}
                                                                            onRemove={() => removeAvailabilityBlock(b.id)}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default RacePlanner;
