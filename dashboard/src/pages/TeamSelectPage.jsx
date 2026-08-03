import { Link } from 'react-router-dom';
import { NavBar } from '@/components/NavBar';
import { useDrivers } from '@/hooks/useDrivers';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

// Landing page: which MURDER entry's live view to open. Teams come
// straight from the roster (entry_drivers.entry_name) — no hardcoded
// list, so adding a new entry there is all it takes for it to show up
// here and get its own isolated live view.
function TeamSelectPage() {
  const { data: entries, loading, error } = useDrivers('entry-drivers');

  const teams = [...new Set(entries.map((e) => e.entry_name).filter(Boolean))].sort();

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-heading font-medium">Pit Wall</h1>
      </div>

      <NavBar />

      <Card>
        <CardHeader>
          <CardTitle>Select a team</CardTitle>
          <CardDescription>
            {loading
              ? 'Loading roster…'
              : error
                ? `Couldn't load roster: ${error}`
                : 'Pick which entry\'s live view to open'}
          </CardDescription>
        </CardHeader>
      </Card>

      {teams.length > 0 && (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {teams.map((team) => (
            <Link key={team} to={`/t/${encodeURIComponent(team)}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardHeader>
                  <CardTitle>{team}</CardTitle>
                  <CardDescription>Open live view</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!loading && !error && teams.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          No entries yet — add one on the{' '}
          <Link to="/drivers" className="underline">
            Drivers
          </Link>{' '}
          page and it'll show up here.
        </p>
      )}
    </div>
  );
}

export default TeamSelectPage;
