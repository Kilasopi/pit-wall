import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function TireWearCard({
  frontLeft,
  frontRight,
  rearLeft,
  rearRight,
}) {
  const frontLeftWear = Math.min(100, Math.max(0, frontLeft))
  const frontRightWear = Math.min(100, Math.max(0, frontRight))
  const rearLeftWear = Math.min(100, Math.max(0, rearLeft))
  const rearRightWear = Math.min(100, Math.max(0, rearRight))

  return (
    <Card className="w-40 overflow-hidden">
        <CardHeader className="pb-3">
            <CardTitle className="text-center text-sm">
            Tire Wear
            </CardTitle>
        </CardHeader>

        <CardContent>
            <div className="relative h-52 overflow-hidden rounded-md border bg-muted">
            {/* Tire wear fill */}
                <div
                    className="absolute inset-x-0 bottom-0 bg-blue-500 transition-[height] duration-500 ease-out"
                    style={{ height: `${(frontLeftWear + frontRightWear + rearLeftWear + rearRightWear) / 4}%` }}
                />

                {/* Tire wear information */}
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">
                    {Math.round((frontLeftWear + frontRightWear + rearLeftWear + rearRightWear) / 4)}%
                    </span>

                    <div className="mt-2 text-sm text-muted-foreground">
                        <div>FL: {frontLeftWear.toFixed(1)}%</div>
                        <div>FR: {frontRightWear.toFixed(1)}%</div>
                        <div>RL: {rearLeftWear.toFixed(1)}%</div>
                        <div>RR: {rearRightWear.toFixed(1)}%</div>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
    )
}