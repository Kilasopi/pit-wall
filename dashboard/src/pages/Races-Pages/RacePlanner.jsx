import { useState } from 'react';
import { useParams } from "react-router-dom";
import { useRaceEventTeams } from "@/hooks/useRaceEventTeams";
import { useDrivers } from '@/hooks/useDrivers';
import { RELAY_HTTP_URL } from '@/lib/relay';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function RacePlanner() {
    const { raceEventId } = useParams();
    const { teams, unassigned, refetch } = useRaceEventTeams(raceEventId);
    const { data: registeredRaces } = useDrivers('registered-races');
    const raceInfo = registeredRaces.find((r) => String(r.race_event_id) === raceEventId);

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
                    {raceInfo?.length_minutes && ` · ${Math.floor(raceInfo.length_minutes / 60)}h`}
                </p>
            </div>
            <div className="">
                <Card>
                    <CardHeader>
                        <CardTitle>Race Planner</CardTitle>
                        <CardDescription></CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 flex items-end gap-2">
                            <div>
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
                            <Button onClick={createTeam} disabled={!newTeamClass || !newTeamName.trim()}>
                                Create Team
                            </Button>
                        </div>
                        {teams.length > 0 && (
                            <Card className={"mb-4"}>
                                <CardHeader>
                                    <CardTitle>Assigned Drivers</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-2">
                                    {teams.map((t) => (
                                        <Card key={t.id}>
                                            <CardHeader>
                                                <div className="flex items-center gap-2">
                                                    <CardTitle>{t.name} — {t.car_class}</CardTitle>
                                                    <Button variant="ghost" size="sm" onClick={() => deleteTeam(t.id)}>
                                                        Delete Team
                                                    </Button>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                {t.members.map((m) => (
                                                    <div key={m.signup_id} className="flex items-center gap-2">
                                                        <p>{m.name}</p>
                                                        <Button variant="ghost" size="sm" onClick={() => leaveTeam(m.signup_id)}>
                                                            Leave
                                                        </Button>
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                        {unassigned.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Unasigned Drivers</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {unassigned.map((u) => (
                                        <div key={u.signup_id} className="flex items-center gap-2">
                                            <p>{u.driver_name || u.guest_name}</p>
                                            {teams.filter(t => t.car_class === u.car_class).map(t => (
                                                <Button key={t.id} variant="outline" size="sm" onClick={() => joinTeam(t.id, u.signup_id)}>
                                                    Join {t.name}
                                                </Button>
                                            ))}
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default RacePlanner;