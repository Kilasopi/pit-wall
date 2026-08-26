import { useState } from 'react';
import { useParams } from "react-router-dom";
import { useRaceEventTeams } from "@/hooks/useRaceEventTeams";
import { useDrivers } from '@/hooks/useDrivers';
import { RELAY_HTTP_URL } from '@/lib/relay';
import { useAuth } from '@/hooks/useAuth';
import { X } from 'lucide-react';
import { useRaceEventCarClasses } from '@/hooks/useRaceEventCarClasses';
import { useTimezone, formatInTimezone, getUtcOffsetLabel } from '@/hooks/useTimeZone';
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

    const [viewerTimezone] = useTimezone();

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

    function deleteTeam(teamId) {
        fetch(`${RELAY_HTTP_URL}/api/teams/${teamId}`, { method: 'DELETE' }).then(refetch);
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

    function clearCarVote(teamId, signupId) {
        fetch(`${RELAY_HTTP_URL}/api/teams/${teamId}/car-votes/${signupId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        }).then(refetch);
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
    const availableClasses = [...new Set([...unassigned.map((u) => u.car_class), ...teams.map((t) => t.car_class)])];

    function createTeam() {
        if (!newTeamClass || !newTeamName.trim()) return;
        fetch(`${RELAY_HTTP_URL}/api/race-events/${raceEventId}/teams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ carClass: newTeamClass, name: newTeamName.trim() }),
        }).then(() => {
            setNewTeamName('');
            refetch();
        });
    }

    return(
        <div className='min-h-screen bg-background p-6 text-foreground'>
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
                                    <div key={cls} className="mb-1 gap-4">
                                        <span className="text-sm font-semibold text-foreground">{cls}:</span>{' '}
                                        {carClasses.filter((name) => classifyCarName(name) === cls).join(', ')}
                                    </div>
                                ))}
                            </div>

                            <div>
                                <p className="mb-1 font-medium text-base">Timeslots</p>
                                {timeslots.map((ts, i) => (
                                    <div key={ts.id}>
                                        Slot {i + 1}: {formatInTimezone(ts.start_at, viewerTimezone, { dateStyle: 'full', timeStyle: 'short' })} {getUtcOffsetLabel(viewerTimezone)}
                                        {' | '}
                                        {formatInTimezone(ts.start_at, 'UTC', { dateStyle: 'full', timeStyle: 'short' })} UTC
                                    </div>
                                ))}
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
                                <p className='text-base font-medium'>Create New Team Entry</p>
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
                                disabled={!newTeamClass || !newTeamName.trim()}
                                className="border-rounded-lg murder-shine border-2 border-transparent bg-origin-border [background:linear-gradient(var(--card),var(--card))_padding-box,linear-gradient(to_right,var(--murder-fuchsia),var(--murder-cyan))_border-box]"
                            >
                                Create Team
                            </Button>
                        </div>
                        {teams.length > 0 && (
                            <div className="mb-4">
                                <div className="flex flex-col divide-y divide-murder-fuchsia/30">
                                    {teams.map((t) => (
                                        <div key={t.id} className="py-6 first:pt-0 last:pb-0">
                                            <div className="mb-2 flex items-center gap-2">
                                                <p className="font-medium text-lg">{t.name} — {t.car_class}</p>
                                                <Button variant="dark" size="sm" onClick={() => deleteTeam(t.id)} className='border-murder-pink-dark'>
                                                    Delete Team
                                                </Button>
                                            </div>
                                            <div className="flex flex-col divide-y divide-murder-cyan/20">
                                                {t.members.map((m) => {
                                                    const vote = t.carVotes?.find((v) => v.signup_id === m.signup_id);
                                                    return (
                                                        <div key={m.signup_id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                                                            <div className="flex items-center justify-between">
                                                                <p className="font-medium text-base">{m.name}</p>
                                                                <Button variant="dark" size="sm" onClick={() => leaveTeam(m.signup_id)} className="border-murder-violet">
                                                                    Leave Team
                                                                </Button>
                                                            </div>

                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-xs text-muted-foreground">Car</span>
                                                                <div className="flex flex-wrap items-center gap-1">
                                                                    <CarVoteSelect
                                                                        carClass={t.car_class}
                                                                        carOptions={carClasses}
                                                                        onSubmit={(carName) => castCarVote(t.id, m.signup_id, carName)}
                                                                    />
                                                                    {vote && (
                                                                        <Badge variant="secondary" className="gap-1">
                                                                            {vote.car_name}
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon-sm"
                                                                                onClick={() => clearCarVote(t.id, m.signup_id)}
                                                                            >
                                                                                <X className="size-3.5" />
                                                                            </Button>
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-xs text-muted-foreground">Availability</span>
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
