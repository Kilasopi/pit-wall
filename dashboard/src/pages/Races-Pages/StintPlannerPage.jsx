import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useDrivers } from '@/hooks/useDrivers';
import { StintGroup } from '@/components/StintGroup';
import { cn } from '@/lib/utils';
import { carTypeImage } from '@/lib/carTypes';

function groupEntries(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.event_name}|||${row.entry_name}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        eventName: row.event_name,
        entryName: row.entry_name,
        carType: row.car_type ?? null,
        drivers: [],
      });
    }
    groups.get(key).drivers.push(row);
  }
  return [...groups.values()];
}

function StintPlannerPage() {
  const { raceEventId } = useParams();
  const { data: entryRows, loading: entriesLoading } = useDrivers('entry-drivers');
  const { data: registeredRaces, loading: racesLoading } = useDrivers('registered-races');

  // entry_drivers has no race_event_id FK yet — it only carries a free-text
  // event_name, so we match it back to this race event by name. Fragile if
  // names ever drift between race_events and entry_drivers; a real FK is
  // the long-term fix once entries start getting created from teams.
  const eventName = registeredRaces.find((r) => String(r.race_event_id) === raceEventId)?.event_name;

  const groups = eventName ? groupEntries(entryRows.filter((r) => r.event_name === eventName)) : [];
  const [activeKey, setActiveKey] = useState(null);

  const activeGroup = groups.find((g) => g.key === activeKey) ?? groups[0] ?? null;
  const loading = entriesLoading || racesLoading;

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No entry drivers for this event yet — entries are created once teams are settled.
        </p>
      ) : (
        <>
          {groups.length > 1 && (
            <div className="flex flex-wrap gap-2 border-b pb-2">
              {groups.map((group) => (
                <button
                  key={group.key}
                  onClick={() => setActiveKey(group.key)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    activeGroup?.key === group.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  {carTypeImage(group.carType) && (
                    <img src={carTypeImage(group.carType)} alt="" className="h-5 w-auto" />
                  )}
                  {group.entryName}
                </button>
              ))}
            </div>
          )}

          {activeGroup && <StintGroup key={activeGroup.key} group={activeGroup} />}
        </>
      )}
    </div>
  );
}

export default StintPlannerPage;
