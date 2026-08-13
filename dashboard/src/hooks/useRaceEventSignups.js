import { useEffect, useState } from 'react';
import { RELAY_HTTP_URL } from '@/lib/relay';

export function useRaceEventSignups(raceEventId) {
    const [signups, setSignups] = useState([]);

    function load() {
        return fetch(`${RELAY_HTTP_URL}/api/race-events/${raceEventId}/signups`)
            .then((res) => res.json())
            .then((rows) => setSignups(rows))
            .catch(() => setSignups([]));
    }

    useEffect(() => {
        let cancelled = false;

        fetch(`${RELAY_HTTP_URL}/api/race-events/${raceEventId}/signups`)
            .then((res) => res.json())
            .then((rows) => { if (!cancelled) setSignups(rows); })
            .catch(() => { if (!cancelled) setSignups([]); });

        return () => { cancelled = true; };
    }, [raceEventId]);

    return { signups, refetch: load };
}