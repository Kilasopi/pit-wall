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

export function RegisteredRaces() {
    const registeredRaces = getRegisteredRaces();
    const navigate = useNavigate();

    return(
        <Card>
            <CardHeader>
                <CardTitle>Registered Races</CardTitle>
            </CardHeader>
            <CardContent>
                {registeredRaces.map((r) => {
                    return (
                        <Card key={r.race_event_id}
                            onClick={() => navigate(`/races/${r.race_event_id}`)}
                            className={`mb-2 cursor-pointer transition-colors hover:bg-accent/50 ${r.source === 'special_event' ? 'border border-blue-500 bg-blue-950/40' : ''}`}
                            >
                            <CardHeader>
                                <CardTitle>
                                    {r.event_name}
                                </CardTitle>
                                <CardDescription>
                                    {r.car_class}
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
                                <p>Registrations: {r.signup_count}</p>
                            </CardContent>
                        </Card>
                    )
                })}
            </CardContent>
        </Card>
    )
}