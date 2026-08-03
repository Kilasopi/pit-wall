import { Fragment } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { ADJUSTMENTS } from './AdjustmentsCard';

// stintHistory is newest-first (see useAgentSocket's 'stintClosed' reducer
// case) and each closed stint carries the outgoing driver's settings
// snapshot — so the most recent entry is exactly "what the last driver had
// set" for whoever's about to get in the car next.
export function PreviousDriverSettingsCard({ stintHistory }) {
  const lastStint = stintHistory?.[0];
  const rows = ADJUSTMENTS.filter(
    ({ key }) => typeof lastStint?.settings?.[key] === 'number'
  ).map(({ key, label, format }) => ({ label, value: format(lastStint.settings[key]) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Previous Driver's Settings</CardTitle>
        <CardDescription>
          {lastStint
            ? `As left by ${lastStint.driver}`
            : 'No completed stint yet this session'}
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
            No adjustable settings were recorded for the previous stint.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
