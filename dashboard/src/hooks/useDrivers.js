import { useEffect, useState } from 'react';
import { RELAY_HTTP_URL } from '@/lib/relay';

const POLL_INTERVAL_MS = 3000;

export function useDrivers(endpoint) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    function load() {
      fetch(`${RELAY_HTTP_URL}/api/${endpoint}`)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
          return res.json();
        })
        .then((rows) => {
          if (!cancelled) {
            setData(rows);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [endpoint]);

  return { data, loading, error };
}
