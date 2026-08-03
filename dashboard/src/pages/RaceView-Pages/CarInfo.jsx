import { FuelCard } from '@/components/datacards/FuelCard';
import { TireWearCard } from '@/components/datacards/TireWearCard';
import { AdjustmentsCard } from '@/components/datacards/AdjustmentsCard';
import { BatteryCard } from '@/components/datacards/BatteryCard';

function CarInfo({ telemetry }) {
  // FuelLevelPct is 0-1 straight from the SDK; FuelCard wants 0-100.
  // FuelLevel is already in litres, no conversion needed.
  const percentage = telemetry?.FuelLevelPct != null ? telemetry.FuelLevelPct * 100 : 0;
  const fuelLitres = telemetry?.FuelLevel;

  const frontLeft = telemetry?.TireWearFrontLeft;
  const frontRight = telemetry?.TireWearFrontRight;
  const rearLeft = telemetry?.TireWearRearLeft;
  const rearRight = telemetry?.TireWearRearRight;

  // Only GTP/LMDh cars report this — everyone else just won't have the field.
  const hasBattery = typeof telemetry?.EnergyBattPct === 'number';
  const batteryPercentage = hasBattery ? telemetry.EnergyBattPct * 100 : null;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-heading font-medium">Car Information</h1>
      <div className="flex flex-wrap gap-4">
        <FuelCard percentage={percentage} fuelLitres={fuelLitres} />
        {hasBattery && <BatteryCard percentage={batteryPercentage} />}
        <TireWearCard
          frontLeft={frontLeft}
          frontRight={frontRight}
          rearLeft={rearLeft}
          rearRight={rearRight}
        />
      </div>
      <AdjustmentsCard telemetry={telemetry} />
    </div>
  );
}

export default CarInfo;
