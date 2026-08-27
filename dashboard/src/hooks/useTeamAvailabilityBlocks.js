import { useEffect, useState } from 'react';
import { RELAY_HTTP_URL } from '@/lib/relay';

export function useTeamAvailabilityBlocks(teamId, token) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    function load() {
        return fetch(`${RELAY_HTTP_URL}/api/teams/${teamId}/availability-blocks`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((rows) => setData(rows))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        load();
    }, [teamId, token]);

    return { data, loading, refetch: load };
}