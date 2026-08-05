import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const FOLLOW_CAMERA = '__follow_camera__';

// Lets the strategist pin the pitwall's data to one car while spectating
// others — otherwise the pitwall follows wherever the iRacing camera
// points (CamCarIdx), which isn't what you want if you're checking in on
// other cars but still tracking your own team's stint/incidents.
export function SpectateLockCard({ session, lockedCarNumber, lockCar }) {
  const drivers = session?.DriverInfo?.Drivers ?? [];
  const cars = [...new Map(drivers.map((d) => [String(d.CarNumber), d])).values()].sort(
    (a, b) => Number(a.CarNumber) - Number(b.CarNumber)
  );

  const value = lockedCarNumber ?? FOLLOW_CAMERA;
  const lockedDriver = lockedCarNumber
    ? cars.find((d) => String(d.CarNumber) === String(lockedCarNumber))
    : null;
  const valueLabel =
    value === FOLLOW_CAMERA
      ? 'Follow camera'
      : `#${lockedCarNumber} — ${lockedDriver?.UserName ?? 'Unknown driver'}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spectate Lock</CardTitle>
        <CardDescription>
          {lockedCarNumber
            ? `Pinned to car #${lockedCarNumber} regardless of camera`
            : 'Following the spectator camera'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select
          value={value}
          onValueChange={(v) => lockCar?.(v === FOLLOW_CAMERA ? null : v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Follow camera">{valueLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FOLLOW_CAMERA}>Follow camera</SelectItem>
            {cars.map((d) => (
              <SelectItem key={d.CarNumber} value={String(d.CarNumber)}>
                #{d.CarNumber} — {d.UserName ?? 'Unknown driver'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
