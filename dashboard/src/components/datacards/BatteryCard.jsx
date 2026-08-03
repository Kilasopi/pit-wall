import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// GTP/LMDh hybrid state of charge. EnergyBattPct is 0-1 from the SDK; only
// those cars report it at all, so this card should only be rendered when
// the value is actually present (see CarInfo.jsx).
export function BatteryCard({ percentage }) {
  const level = Math.min(100, Math.max(0, percentage))

  return (
    <Card className="w-40 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-center text-sm">Battery</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="relative h-52 overflow-hidden rounded-md border bg-muted">
          <div
            className="absolute inset-x-0 bottom-0 bg-amber-500 transition-[height] duration-500 ease-out"
            style={{ height: `${level}%` }}
          />

          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{Math.round(level)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
