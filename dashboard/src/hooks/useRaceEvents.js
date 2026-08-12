import { useEffect, useState } from 'react';
import { RELAY_HTTP_URL } from '@/lib/relay';

export function useRaceEvents() {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        let cancelled = false;

        fetch(`${RELAY_HTTP_URL}/api/race-events`)
            .then((res) => res.json())
            .then((series) => {
                if (!cancelled) setEvents(series)
            })
            .catch(() => {
                if (!cancelled) setEvents([])
            });
    }, []);

    return events
}