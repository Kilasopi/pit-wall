import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// wear is the SDK's fraction of tread remaining (0-1); temp is already in
// the SDK's native °C (confirmed against real in-sim readings — despite
// the "tempC" field name suggesting otherwise, it is not °F).
function TireSection({ label, wear, temp }) {
  const remaining = wear != null ? Math.min(100, Math.max(0, wear * 100)) : null
  const tempF = temp != null ? (temp * 9) / 5 + 32 : null

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <div className="relative h-20 w-6 overflow-hidden rounded-md border bg-muted">
        <div
          className="absolute inset-x-0 bottom-0 bg-blue-500 transition-[height] duration-500 ease-out"
          style={{ height: `${remaining ?? 0}%` }}
        />
      </div>
      <span className="text-xs font-bold">{remaining != null ? `${Math.round(remaining)}%` : '—'}</span>
      <span className="text-[10px] text-muted-foreground">
        {tempF != null ? `${Math.round(tempF)}°F` : '—'}
      </span>
      <span className="text-[10px] text-muted-foreground">
        {temp != null ? `${Math.round(temp)}°C` : '—'}
      </span>
    </div>
  )
}

// Each corner reports wear/temp across three zones of the tread. The SDK
// names them L/M/R, but which edge is "outer" (facing away from the car)
// flips between the left and right side of the car — flip the display
// order here so "outer" always means outer regardless of corner.
function TireCorner({ label, corner }) {
  const outer = corner?.outer
  const middle = corner?.middle
  const inner = corner?.inner

  return (
    <Card className="w-fit overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-xs">{label}</CardTitle>
      </CardHeader>

      <CardContent className="flex gap-2 px-2">
        <TireSection label="Out" wear={outer?.wear} temp={outer?.temp} />
        <TireSection label="Mid" wear={middle?.wear} temp={middle?.temp} />
        <TireSection label="In" wear={inner?.wear} temp={inner?.temp} />
      </CardContent>
    </Card>
  )
}

export function TireWearCard({ frontLeft, frontRight, rearLeft, rearRight }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <TireCorner label="FL" corner={frontLeft} />
      <TireCorner label="FR" corner={frontRight} />
      <TireCorner label="RL" corner={rearLeft} />
      <TireCorner label="RR" corner={rearRight} />
    </div>
  )
}
