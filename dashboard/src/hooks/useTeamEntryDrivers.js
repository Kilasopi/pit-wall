import { useEffect, useState } from 'react';
import { RELAY_HTTP_URL } from '@/lib/relay';

const POLL_INTERVAL_MS = 3000;

export function useTeamEntryDrivers(teamId, token) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    function load() {
        return fetch(`${RELAY_HTTP_URL}/api/teams/${teamId}/entry-drivers`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((rows) => setData(rows))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        let cancelled = false;
        load();
        const interval = setInterval(load, POLL_INTERVAL_MS);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [teamId, token]);

    return { data, loading, refetch: load };
}