import { useEffect, useState } from 'react';
import { RELAY_HTTP_URL } from '@/lib/relay';

export function useRaceEventTeams(raceEventId){
    const [data, setData] = useState({ teams: [], unassigned: [], timeslots: [] });

    function load() {
        return fetch(`${RELAY_HTTP_URL}/api/race-events/${raceEventId}/teams`)
            .then((res) => res.json())
            .then((rows) => setData(rows))
            .catch(() => setData({ teams: [], unassigned: [], timeslots: []}));
    }

    useEffect(() => {
        let cancelled =false;

        fetch(`${RELAY_HTTP_URL}/api/race-events/${raceEventId}/teams`)
            .then((res) => res.json())
            .then((rows) => { if (!cancelled) setData(rows); })
            .catch(() => { if (!cancelled) setData({ teams: [], unassigned: [], timeslots: [] }); });
        
            return () => { cancelled = true; };
    }, [raceEventId]);

    return { ...data, refetch: load };
}