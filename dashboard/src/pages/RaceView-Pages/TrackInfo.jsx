import { TrackInfoCard } from '@/components/datacards/TrackInfoCard';

function TrackInfo({ session, telemetry }) {

  const trackName = session?.WeekendInfo?.TrackName ?? '—';
  const skies = telemetry?.Skies ?? '—';
  const airTemp = telemetry?.AirTemp?.toFixed(1) ?? '—';
  const trackTemp = telemetry?.TrackTemp?.toFixed(1) ?? '—';
  const humidity = (telemetry?.RelativeHumidity * 100)?.toFixed(0) ?? '—';
  const windSpeed = (telemetry.WindVel * 3.6).toFixed(1) ?? '—';
  const windDirection = telemetry?.WindDir ?? '—';
  const precipitation = (telemetry?.Precipitation * 100)?.toFixed(1) ?? '—';

  return (
    <div>
      <h1>Track Information</h1>
      <TrackInfoCard 
        TrackName={trackName} 
        skies={skies}
        airTemp={airTemp}
        trackTemp={trackTemp}
        humidity={humidity}
        windSpeed={windSpeed}
        windDirection={windDirection}
        precipitation={precipitation}
      />
    </div>
  );
}

export default TrackInfo;
