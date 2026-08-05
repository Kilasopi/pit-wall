import { FuelCard } from '@/components/datacards/FuelCard';
import { TireWearCard } from '@/components/datacards/TireWearCard';
import { AdjustmentsCard } from '@/components/datacards/AdjustmentsCard';
import { BatteryCard } from '@/components/datacards/BatteryCard';
import { PreviousDriverSettingsCard } from '@/components/datacards/PreviousDriverSettingsCard';

function CarInfo({ telemetry, stintHistory }) {
  // FuelLevelPct is 0-1 straight from the SDK; FuelCard wants 0-100.
  // FuelLevel is already in litres, no conversion needed.
  const percentage = telemetry?.FuelLevelPct != null ? telemetry.FuelLevelPct * 100 : 0;
  const fuelLitres = telemetry?.FuelLevel;

  // The SDK reports wear (fraction remaining) and temp (°F) across three
  // tread zones per corner, named L/M/R. Which edge is "outer" (facing
  // away from the car) flips between the left and right side of the car,
  // so left-side corners read L as outer/R as inner and right-side
  // corners read the reverse.
  function readCorner(prefix, outerSuffix, innerSuffix) {
    return {
      outer: {
        wear: telemetry?.[`${prefix}wear${outerSuffix}`],
        temp: telemetry?.[`${prefix}tempC${outerSuffix}`],
      },
      middle: {
        wear: telemetry?.[`${prefix}wearM`],
        temp: telemetry?.[`${prefix}tempCM`],
      },
      inner: {
        wear: telemetry?.[`${prefix}wear${innerSuffix}`],
        temp: telemetry?.[`${prefix}tempC${innerSuffix}`],
      },
    };
  }

  const frontLeft = readCorner('LF', 'L', 'R');
  const frontRight = readCorner('RF', 'R', 'L');
  const rearLeft = readCorner('LR', 'L', 'R');
  const rearRight = readCorner('RR', 'R', 'L');

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
      <div className="flex flex-wrap gap-4">
        <AdjustmentsCard telemetry={telemetry} />
        <PreviousDriverSettingsCard stintHistory={stintHistory} />
      </div>
    </div>
  );
}

export default CarInfo;
