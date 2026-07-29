import { useEffect, useState } from 'react';
import { RELAY_HTTP_URL } from '@/lib/relay';

export function useSpecialEvents() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let cancelled = false;

    fetch(`${RELAY_HTTP_URL}/api/special-events`)
      .then((res) => res.json())
      .then((names) => {
        if (!cancelled) setEvents(names);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return events;
}
