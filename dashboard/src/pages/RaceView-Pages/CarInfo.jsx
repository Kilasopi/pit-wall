import { FuelCard } from '@/components/datacards/FuelCard';
import { TireWearCard } from '@/components/datacards/TireWearCard';

function CarInfo({ telemetry }) {
  // FuelLevelPct is 0-1 straight from the SDK; FuelCard wants 0-100.
  // FuelLevel is already in litres, no conversion needed.
  const percentage = telemetry?.FuelLevelPct != null ? telemetry.FuelLevelPct * 100 : 0;
  const fuelLitres = telemetry?.FuelLevel;

  const frontLeft = telemetry?.TireWearFrontLeft;
  const frontRight = telemetry?.TireWearFrontRight;
  const rearLeft = telemetry?.TireWearRearLeft;
  const rearRight = telemetry?.TireWearRearRight;

  return (
    <div>
      <h1>Car Information</h1>
      {/* Add your car information components here */}
      <FuelCard percentage={percentage} fuelLitres={fuelLitres} />
      <TireWearCard
        frontLeft={frontLeft}
        frontRight={frontRight}
        rearLeft={rearLeft}
        rearRight={rearRight}
      />
    </div>
  );
}

export default CarInfo;