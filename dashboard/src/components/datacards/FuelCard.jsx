import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function FuelCard({
  percentage,
  fuelLitres,
}) {
  const fuelLevel = Math.min(100, Math.max(0, percentage))

  return (
    <Card className="w-40 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-center text-sm">
          Fuel
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="relative h-52 overflow-hidden rounded-md border bg-muted">
          {/* Fuel fill */}
          <div
            className="absolute inset-x-0 bottom-0 bg-emerald-500 transition-[height] duration-500 ease-out"
            style={{ height: `${fuelLevel}%` }}
          />

          {/* Fuel information */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">
              {Math.round(fuelLevel)}%
            </span>

            {fuelLitres !== undefined && (
              <span className="text-sm text-muted-foreground">
                {fuelLitres.toFixed(1)} L
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}