import { useEffect, useRef, useState } from 'react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { classColorToCss } from '@/hooks/convertLeaderboardData';

// Stadium-shaped stand-in for tracks we don't have a real outline for yet
// (iRacing has currently paused issuing the OAuth client credentials the
// real Data API track map needs — see agent/track_map_service.js). Not to
// scale or shape, just something to place cars on by lap-distance percent.
const GENERIC_WIDTH = 1000;
const GENERIC_HEIGHT = 400;
const GENERIC_RADIUS = GENERIC_HEIGHT / 2;
const GENERIC_TRACK_PATH = `M ${GENERIC_RADIUS} 0 H ${GENERIC_WIDTH - GENERIC_RADIUS} A ${GENERIC_RADIUS} ${GENERIC_RADIUS} 0 0 1 ${GENERIC_WIDTH - GENERIC_RADIUS} ${GENERIC_HEIGHT} H ${GENERIC_RADIUS} A ${GENERIC_RADIUS} ${GENERIC_RADIUS} 0 0 1 ${GENERIC_RADIUS} 0 Z`;

// Car positions are plotted by walking the track outline path with SVG's
// getPointAtLength — same technique community iRacing overlays use, since
// telemetry only gives lap-distance percent (0-1), not X/Y. Works the same
// whether the path is a real outline or the generic stand-in above.
export function TrackMapCard({ trackMap, telemetry, session }) {
  const pathRef = useRef(null);
  const [pathLength, setPathLength] = useState(0);
  const [bounds, setBounds] = useState(null);

  const isRealMap = !!trackMap?.path;
  const trackPath = trackMap?.path ?? GENERIC_TRACK_PATH;

  useEffect(() => {
    if (!pathRef.current) return;
    setPathLength(pathRef.current.getTotalLength());
    setBounds(pathRef.current.getBBox());
  }, [trackPath]);

  const drivers = session?.DriverInfo?.Drivers ?? [];
  const playerCarIdx = session?.DriverInfo?.DriverCarIdx;
  const lapDistPct = telemetry?.CarIdxLapDistPct;
  const trackSurface = telemetry?.CarIdxTrackSurface;

  const cars = drivers
    .filter((driver) => !driver.CarIsPaceCar && !driver.IsSpectator)
    .map((driver) => {
      const idx = driver.CarIdx;
      const pct = Array.isArray(lapDistPct) ? lapDistPct[idx] : undefined;
      const surface = Array.isArray(trackSurface) ? trackSurface[idx] : undefined;
      return {
        idx,
        driver,
        pct,
        onTrack: surface != null && surface !== -1,
        classColor: classColorToCss(driver.CarClassColor),
      };
    })
    .filter((car) => car.onTrack && car.pct != null && car.pct >= 0);

  const points =
    pathLength && pathRef.current
      ? cars.map((car) => {
          const point = pathRef.current.getPointAtLength(((car.pct % 1) + 1) % 1 * pathLength);
          return { ...car, x: point.x, y: point.y };
        })
      : [];

  const strokeWidth = bounds ? Math.max(bounds.width, bounds.height) * 0.012 : 20;
  const carRadius = bounds ? Math.max(bounds.width, bounds.height) * 0.018 : 30;

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Track Map</CardTitle>
        <CardDescription>
          {isRealMap
            ? `${cars.length} car${cars.length === 1 ? '' : 's'} on track`
            : `${cars.length} car${cars.length === 1 ? '' : 's'} on track (approximate shape — real track outline unavailable)`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={
            bounds
              ? `${bounds.x - strokeWidth * 2} ${bounds.y - strokeWidth * 2} ${bounds.width + strokeWidth * 4} ${bounds.height + strokeWidth * 4}`
              : '0 0 100 100'
          }
          className="h-auto max-h-[420px] w-full"
        >
          <path
            ref={pathRef}
            d={trackPath}
            fill="none"
            stroke="currentColor"
            className="text-muted-foreground"
            strokeWidth={strokeWidth}
            strokeDasharray={isRealMap ? undefined : strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((car) => (
            <circle
              key={car.idx}
              cx={car.x}
              cy={car.y}
              r={car.idx === playerCarIdx ? carRadius * 1.3 : carRadius}
              strokeWidth={car.idx === playerCarIdx ? strokeWidth * 0.4 : strokeWidth * 0.2}
              style={{
                fill: car.classColor,
                stroke: car.idx === playerCarIdx ? 'white' : 'black',
                transition: 'cx 0.1s linear, cy 0.1s linear',
              }}
            />
          ))}
        </svg>
      </CardContent>
    </Card>
  );
}
