import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Loud, full-width alerts for anything the crew needs to see regardless of
// which Race View page they're on — rendered once in RaceView.jsx above
// the page routes so it doesn't reset on navigation. Fuel is the only
// threshold wired up so far; add more checks here as they come up (tire
// wear, etc.) — each just needs a severity + message.
export function ThresholdAlertBanner({ fuel }) {
  const alerts = [];

  if (fuel?.lapsRemainingEst != null) {
    if (fuel.lapsRemainingEst <= 3) {
      alerts.push({
        severity: 'critical',
        message: `LOW FUEL — ${fuel.lapsRemainingEst} laps remaining, pit now`,
      });
    } else if (fuel.lapsRemainingEst <= 8) {
      alerts.push({
        severity: 'warning',
        message: `Fuel getting low — ${fuel.lapsRemainingEst} laps remaining`,
      });
    }
  }

  if (alerts.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold tracking-wide',
            alert.severity === 'critical'
              ? 'bg-red-600 text-white'
              : 'bg-yellow-400 text-black'
          )}
        >
          <AlertTriangle className="size-4 shrink-0" />
          {alert.message}
        </div>
      ))}
    </div>
  );
}
