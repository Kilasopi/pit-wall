import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function TireGauge({ label, percentage }) {
  const wear = Math.min(100, Math.max(0, percentage ?? 0))

  return (
    <Card className="w-20 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-xs">{label}</CardTitle>
      </CardHeader>

      <CardContent className="px-2">
        <div className="relative h-28 overflow-hidden rounded-md border bg-muted">
          <div
            className="absolute inset-x-0 bottom-0 bg-blue-500 transition-[height] duration-500 ease-out"
            style={{ height: `${wear}%` }}
          />

          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <span className="text-sm font-bold">{Math.round(wear)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TireWearCard({
  frontLeft,
  frontRight,
  rearLeft,
  rearRight,
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <TireGauge label="FL" percentage={frontLeft} />
      <TireGauge label="FR" percentage={frontRight} />
      <TireGauge label="RL" percentage={rearLeft} />
      <TireGauge label="RR" percentage={rearRight} />
    </div>
  )
}
