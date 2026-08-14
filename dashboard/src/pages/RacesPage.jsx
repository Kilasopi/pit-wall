import { NavBar } from '@/components/NavBar';
import { RegisteredRaces } from '@/components/RegisteredRaces';

function RacesPage() {
    return (
        <div className="min-h-screen bg-background p-6 text-foreground">
            <div className="mb-2 flex items-center justify-between">
                <h1 className="text-xl font-heading font-medium">Races</h1>
            </div>
            <NavBar />

            <RegisteredRaces />
        </div>
    );
}

export default RacesPage;
