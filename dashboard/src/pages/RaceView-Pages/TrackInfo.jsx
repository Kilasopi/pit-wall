import { TrackInfoCard } from '@/components/datacards/TrackInfoCard';
import { formatTimeRemaining } from '@/hooks/convertTrackInfoData';
import { convertSkies } from '@/hooks/convertTrackInfoData';
import { convertSessionFlags } from '@/hooks/convertTrackInfoData';
import { convertSectionFlags } from '@/hooks/convertTrackInfoData';

// Placeholder until a real per-section yellow source (spotter input, corner
// worker data, etc.) exists — iRacing telemetry has no such field.
const TRACK_SECTION_COUNT = 5;

function TrackInfo({ session, telemetry }) {
  // Track Info
  const trackName = session?.WeekendInfo?.TrackDisplayName ?? '—';
  const trackLength = session?.WeekendInfo?.TrackLengthOfficial ?? '—';
  const trackNumTurns = session?.WeekendInfo?.TrackNumTurns ?? '—';
  const trackPitLaneSpeedLimit = session?.WeekendInfo?.TrackPitLaneSpeedLimit ?? '—';
  const trackCity = session?.WeekendInfo?.TrackCity ?? '—';
  const trackState = session?.WeekendInfo?.TrackState ?? '';
  const trackCountry = session?.WeekendInfo?.TrackCountry ?? '—';
  const trackAltitude = session?.WeekendInfo?.TrackAltitude ?? '—';
  const trackType = session?.WeekendInfo?.TrackType ?? '—';
  const trackDirection = session?.WeekendInfo?.TrackDirection ?? '—';
  const trackNumPitStalls = session?.WeekendInfo?.TrackNumPitStalls ?? '—';
  const trackPaceSpeed = session?.WeekendInfo?.TrackPaceSpeed ?? '—';
  const trackDynamicTrack =
    session?.WeekendInfo?.TrackDynamicTrack != null
      ? session.WeekendInfo.TrackDynamicTrack ? 'On' : 'Off'
      : '—';

  // Session Info
  const sessionType = session?.SessionInfo?.SessionType ?? '—';
  const sessionTimeRem = formatTimeRemaining(telemetry?.SessionTimeRemain);
  const sessionLapsRem = telemetry?.Racelaps?.toFixed(0) ?? 'NAN';

  // Flags
  const { text: flagsText, className: flagsClassName } = convertSessionFlags(telemetry?.SessionFlags);
  const rawSessionFlags = telemetry?.SessionFlags ?? '—';
  const sessionState = telemetry?.SessionState ?? '—';
  const pitsOpen = telemetry?.PitsOpen ?? '—';
  const { sections, hasWarning, summary } = convertSectionFlags(
    telemetry?.SectionFlags ?? new Array(TRACK_SECTION_COUNT).fill(false)
  );

  // Track Weather
  const { Label: skies, Icon: SkiesIcon } = convertSkies(telemetry?.Skies);
  const airTemp = telemetry?.AirTemp?.toFixed(1) ?? '—';
  const trackTemp = telemetry?.TrackTemp?.toFixed(1) ?? '—';
  const humidity = (telemetry?.RelativeHumidity * 100)?.toFixed(0) ?? '—';
  const windSpeed = 
  telemetry?.WindVel != null
      ? (telemetry.WindVel * 3.6).toFixed(1)
      : '—';
  const windDirection = telemetry?.WindDir ?? '—';
  const precipitation = 
    telemetry?.Precipitation != null
      ? (telemetry.Precipitation * 100).toFixed(1)
      : '—';
  

  return (
    <div>
      <TrackInfoCard 
        TrackName={trackName} 
        Length={trackLength}
        NumTurns={trackNumTurns}
        PitLaneSpeedLimit={trackPitLaneSpeedLimit}
        City={trackCity}
        State={trackState}
        Country={trackCountry}
        Altitude={trackAltitude}
        TrackType={trackType}
        Direction={trackDirection}
        NumPitStalls={trackNumPitStalls}
        PaceSpeed={trackPaceSpeed}
        DynamicTrack={trackDynamicTrack}

        SessionType={sessionType}
        SessionTimeRem={sessionTimeRem}
        SessionLapsRem={sessionLapsRem}

        flagsText={flagsText}
        flagsClassName={flagsClassName}
        rawSessionFlags={rawSessionFlags}
        sessionState={sessionState}
        pitsOpen={pitsOpen}
        sections={sections}
        hasSectionWarning={hasWarning}
        sectionSummary={summary}

        skies={skies}
        skiesIcon={SkiesIcon}
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
