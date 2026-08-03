import { Fragment } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

// In-car adjustable settings (the "dc*" — driver control — telemetry
// variables). Not every car has every system (a GT4 has no diff dials, an
// oval car has no brake bias in some series, etc.), so each row only shows
// up when iRacing actually reports a value for it, rather than padding the
// card out with dashes for systems the current car doesn't have.
const ADJUSTMENTS = [
  { key: 'dcBrakeBias', label: 'Brake Bias', format: (v) => v.toFixed(1) },
  { key: 'dcTractionControl', label: 'Traction Control', format: (v) => v.toFixed(0) },
  { key: 'dcTractionControl2', label: 'Traction Control 2', format: (v) => v.toFixed(0) },
  { key: 'dcABS', label: 'ABS', format: (v) => v.toFixed(0) },
  { key: 'dcEngineBraking', label: 'Engine Braking', format: (v) => v.toFixed(0) },
  { key: 'dcThrottleShape', label: 'Throttle Map', format: (v) => v.toFixed(0) },
  { key: 'dcFuelMixture', label: 'Fuel Mixture', format: (v) => v.toFixed(0) },
  { key: 'dcDiffEntry', label: 'Diff Entry', format: (v) => v.toFixed(0) },
  { key: 'dcDiffMiddle', label: 'Diff Middle', format: (v) => v.toFixed(0) },
  { key: 'dcDiffExit', label: 'Diff Exit', format: (v) => v.toFixed(0) },
  { key: 'dcAntiRollFront', label: 'Anti-Roll Front', format: (v) => v.toFixed(0) },
  { key: 'dcAntiRollRear', label: 'Anti-Roll Rear', format: (v) => v.toFixed(0) },
  { key: 'dcWeightJackerLeft', label: 'Weight Jacker', format: (v) => v.toFixed(0) },
];

export function AdjustmentsCard({ telemetry }) {
  const rows = ADJUSTMENTS.filter(
    ({ key }) => typeof telemetry?.[key] === 'number'
  ).map(({ key, label, format }) => ({ label, value: format(telemetry[key]) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>In-Car Adjustments</CardTitle>
        <CardDescription>
          {rows.length > 0 ? 'Live driver-adjustable settings' : 'No adjustable systems reported'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            {rows.map((row) => (
              <Fragment key={row.label}>
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd>{row.value}</dd>
              </Fragment>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            This car doesn't expose adjustable settings, or none have been read yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
