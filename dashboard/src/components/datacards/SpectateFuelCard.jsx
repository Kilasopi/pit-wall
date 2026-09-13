import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// Spectate-only fuel display — same gauge visual as the crew's FuelCard
// (components/datacards/FuelCard.jsx), but side-by-side with a details
// list instead of that card's tall/narrow layout, so it's not shared:
// changing this doesn't affect the strategist-facing Car Info page.
export function SpectateFuelCard({ percentage, fuelLitres, lapsRemainingEst }) {
  const fuelLevel = Math.min(100, Math.max(0, percentage))

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Fuel</CardTitle>
      </CardHeader>

      <CardContent className="flex items-center gap-4">
        <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-md border bg-muted">
          <div
            className="absolute inset-x-0 bottom-0 bg-emerald-500 transition-[height] duration-500 ease-out"
            style={{ height: `${fuelLevel}%` }}
          />

          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">
              {Math.round(fuelLevel)}%
            </span>

            {fuelLitres !== undefined && (
              <span className="text-xs text-white/70">
                {fuelLitres.toFixed(1)} L / {(fuelLitres * 0.264172).toFixed(1)} gal
              </span>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-white/70">Fuel Remaining</dt>
          <dd>{fuelLitres != null ? `${fuelLitres.toFixed(1)} L / ${(fuelLitres * 0.264172).toFixed(1)} gal` : '—'}</dd>
          <dt className="text-white/70">Percentage</dt>
          <dd>{Math.round(fuelLevel)}%</dd>
          <dt className="text-white/70">Laps Remaining (est.)</dt>
          <dd>{lapsRemainingEst ?? '—'}</dd>
        </dl>
      </CardContent>
    </Card>
  )
}
