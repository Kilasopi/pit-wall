import { useEffect, useState } from 'react';
import { RELAY_HTTP_URL } from '@/lib/relay';

export function useTeamRaceSettings(teamId, token) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    function load() {
        return fetch(`${RELAY_HTTP_URL}/api/teams/${teamId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((row) => setData(row))
            .finally(() => setLoading(false));
    }

    function save(patch) {
        return fetch(`${RELAY_HTTP_URL}/api/teams/${teamId}/race-settings`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(patch),
        }).then((res) => res.json());
    }

    useEffect(() => {
        load();
    }, [teamId, token]);

    return { data, loading, save, refetch: load };
}