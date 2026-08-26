import { useEffect, useState } from 'react';
import { RELAY_HTTP_URL } from '@/lib/relay';

export function useRaceEventCarClasses(raceEventId) {
    const [carClasses, setCarClasses] = useState([]);

    useEffect(() => {
        let cancelled = false;

        fetch(`${RELAY_HTTP_URL}/api/race-events/${raceEventId}/car-classes`)
            .then((res) => res.json())
            .then((data) => { if (!cancelled) setCarClasses(data.carClasses); })
            .catch(() => { if (!cancelled) setCarClasses([]); });

        return () => { cancelled = true; };
    }, [raceEventId]);

    return carClasses;
}
