import { useEffect, useRef, useState } from 'react';

// Counts pit road visits per car by watching CarIdxOnPitRoad transitions —
// iRacing telemetry has no direct "stop count" field. Note this counts pit
// road *entries*, not confirmed stops (a drive-through reads the same), so
// it's a proxy, not an exact stop count. State lives in refs (not React
// state) since it has to persist across telemetry ticks without resetting;
// a version counter in state just triggers re-renders when something changes.
export function usePitCycleTracker(telemetry) {
  const prevOnPitRoad = useRef(new Map());
  const visitCounts = useRef(new Map());
  const lastPitLap = useRef(new Map());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const onPitRoad = telemetry?.CarIdxOnPitRoad;
    const lap = telemetry?.CarIdxLap;
    if (!Array.isArray(onPitRoad)) return;

    let changed = false;
    onPitRoad.forEach((isOnPit, idx) => {
      const wasOnPit = prevOnPitRoad.current.get(idx) ?? false;
      if (isOnPit && !wasOnPit) {
        visitCounts.current.set(idx, (visitCounts.current.get(idx) ?? 0) + 1);
        lastPitLap.current.set(idx, Array.isArray(lap) ? (lap[idx] ?? null) : null);
        changed = true;
      }
      prevOnPitRoad.current.set(idx, isOnPit);
    });

    if (changed) setVersion((v) => v + 1);
  }, [telemetry]);

  return {
    getVisitCount: (carIdx) => visitCounts.current.get(carIdx) ?? 0,
    getLastPitLap: (carIdx) => lastPitLap.current.get(carIdx) ?? null,
    version,
  };
}
