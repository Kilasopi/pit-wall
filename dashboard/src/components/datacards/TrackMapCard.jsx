import { useEffect, useRef, useState } from 'react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { classColorToCss, getSessionClasses } from '@/hooks/convertLeaderboardData';
import { useSectionCautionState, getSectionBoundaries } from '@/hooks/convertTrackInfoData';

// Plain horizontal-line stand-in for tracks we don't have a real outline
// for yet (iRacing has currently paused issuing the OAuth client
// credentials the real Data API track map needs — see
// agent/track_map_service.js). Not to scale or shape, just something to
// place cars on by lap-distance percent, left-to-right for lap pct 0 → 1.
const GENERIC_WIDTH = 1000;
const GENERIC_HEIGHT = 40;
const GENERIC_TRACK_PATH = `M 0 ${GENERIC_HEIGHT / 2} H ${GENERIC_WIDTH}`;

// Samples the path just before/after `pct` to get a tangent, then rotates
// it 90° for the perpendicular ("normal") direction at that point — used
// both to spread multi-class fields into side-by-side lanes and to draw
// section-boundary tick marks across the track rather than along it.
function getPointAndNormal(pathEl, pathLength, pct) {
  const t = (((pct % 1) + 1) % 1) * pathLength;
  const epsilon = Math.max(pathLength * 0.001, 0.5);
  const t1 = Math.max(0, t - epsilon);
  const t2 = Math.min(pathLength, t + epsilon);
  const p1 = pathEl.getPointAtLength(t1);
  const p2 = pathEl.getPointAtLength(t2);
  const point = pathEl.getPointAtLength(t);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  return { point, normal: { x: -dy / len, y: dx / len } };
}

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
  // CamCarIdx, not DriverInfo.DriverCarIdx — see GapBoardCard.jsx for why.
  const playerCarIdx = telemetry?.CamCarIdx;
  const lapDistPct = telemetry?.CarIdxLapDistPct;
  const trackSurface = telemetry?.CarIdxTrackSurface;

  // Multi-class fields plotted on the same lap-distance pct would all sit
  // stacked on top of each other at any given point — offsetting each
  // class into its own lane perpendicular to the track, centered around
  // the actual line, keeps every class visible at once.
  const classes = getSessionClasses(drivers);
  const classLaneIndex = new Map(classes.map((cls, i) => [cls.id, i]));

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
        laneIndex: classLaneIndex.get(driver.CarClassID) ?? 0,
      };
    })
    .filter((car) => car.onTrack && car.pct != null && car.pct >= 0);

  const strokeWidth = bounds ? Math.max(bounds.width, bounds.height) * 0.012 : 20;
  const carRadius = bounds ? Math.max(bounds.width, bounds.height) * 0.008 : 14;
  const laneGap = carRadius * 2.4;
  // Wide enough to fit the outermost class lane plus the tick marks,
  // whichever pushes further out from the plain track outline.
  const margin = strokeWidth * 2 + laneGap * classes.length + carRadius * 2;

  const points =
    pathLength && pathRef.current
      ? cars.map((car) => {
          const { point, normal } = getPointAndNormal(pathRef.current, pathLength, car.pct);
          const offset = classes.length > 1 ? (car.laneIndex - (classes.length - 1) / 2) * laneGap : 0;
          return { ...car, x: point.x + normal.x * offset, y: point.y + normal.y * offset };
        })
      : [];

  // Local-yellow sections, plotted as tick marks across the track at each
  // timing-section boundary — same detection as the Track Info page's
  // caution strip (see convertTrackInfoData.jsx), just visualized here by
  // position instead of as a list.
  const sectionBoundaries = getSectionBoundaries(session);
  const { sections } = useSectionCautionState(session, telemetry);
  const tickHalfLength = strokeWidth * 1.5;

  const sectionMarkers =
    pathLength && pathRef.current
      ? sectionBoundaries.map((boundaryPct, i) => {
          const { point, normal } = getPointAndNormal(pathRef.current, pathLength, boundaryPct);
          return {
            section: i + 1,
            status: sections[i]?.status ?? 'clear',
            x1: point.x - normal.x * tickHalfLength,
            y1: point.y - normal.y * tickHalfLength,
            x2: point.x + normal.x * tickHalfLength,
            y2: point.y + normal.y * tickHalfLength,
          };
        })
      : [];

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
              ? `${bounds.x - margin} ${bounds.y - margin} ${bounds.width + margin * 2} ${bounds.height + margin * 2}`
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
          {sectionMarkers.map((marker) => (
            <line
              key={marker.section}
              x1={marker.x1}
              y1={marker.y1}
              x2={marker.x2}
              y2={marker.y2}
              stroke={marker.status === 'clear' ? 'currentColor' : '#eab308'}
              className={marker.status === 'clear' ? 'text-muted-foreground/40' : undefined}
              strokeWidth={marker.status === 'clear' ? strokeWidth * 0.15 : strokeWidth * 0.3}
            />
          ))}
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
