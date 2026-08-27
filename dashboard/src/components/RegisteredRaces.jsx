import { RELAY_HTTP_URL } from '@/lib/relay';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from '@/components/ui/card';

function getRegisteredRaces() {
    const [races, setRaces] = useState([]);

    useEffect(() => {
        let cancelled = false;
        fetch(`${RELAY_HTTP_URL}/api/registered-races`)
            .then((res) => res.json())
            .then((race) => {
                if (!cancelled) setRaces(race)
            })
            .catch(() => {
                if (!cancelled) setRaces([])
            });
    }, []);

    return races
}

function groupByEvent(rows) {
    const byEvent = rows.reduce((acc, r) => {
        (acc[r.race_event_id] ??= { ...r, classes: [] }).classes.push({
            car_class: r.car_class,
            signup_count: r.signup_count,
        });
        return acc;
    }, {});
    return Object.values(byEvent);
}

export function RegisteredRaces() {
    const registeredRaces = getRegisteredRaces();
    const navigate = useNavigate();
    const events = groupByEvent(registeredRaces);

    return(
        <Card>
            <CardHeader>
                <CardTitle>Registered Races</CardTitle>
            </CardHeader>
            <CardContent>
                {events.map((r) => {
                    const totalRegistrations = r.classes.reduce((sum, c) => sum + c.signup_count, 0);
                    return (
                        <Card key={r.race_event_id}
                            onClick={() => navigate(`/races/${r.race_event_id}`)}
                            className={`mb-2 cursor-pointer transition-colors hover:bg-accent/50 ${r.source === 'special_event' ? 'border border-murder-cyan bg-murder-cyan/10' : ''}`}
                            >
                            <CardHeader>
                                <CardTitle>
                                    {r.event_name}
                                </CardTitle>
                                <CardDescription>
                                    {r.classes.map((c) => c.car_class).join(', ')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p>Track: {r.track}</p>
                                {r.distance_km && <p>Distance: {r.distance_km}km</p>}
                                {r.length_minutes && (
                                    <p>
                                        Length: {Math.floor(r.length_minutes / 60)}h{r.length_minutes % 60 !== 0 && ` ${r.length_minutes % 60}m`}
                                    </p>
                                )}
                                <p>Registrations: {totalRegistrations} total</p>
                                <ul className="text-sm text-muted-foreground">
                                    {r.classes.map((c) => (
                                        <li key={c.car_class}>{c.car_class}: {c.signup_count}</li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )
                })}
            </CardContent>
        </Card>
    )
}