import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar } from '@/components/NavBar';
import { useAuth } from '@/hooks/useAuth';
import { RELAY_HTTP_URL } from '@/lib/relay';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

function ClaimProfilePage() {
    const navigate = useNavigate();
    const { token } = useAuth();

    const [drivers, setDrivers] = useState([]);
    const [selectedDriverId, setSelectedDriverId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch(`${RELAY_HTTP_URL}/api/murder-drivers/unclaimed`)
            .then((res) => res.json())
            .then(setDrivers)
            .catch(() => setDrivers([]));
    }, []);

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch(`${RELAY_HTTP_URL}/api/users/me/claim-driver`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ driverId: Number(selectedDriverId) }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error ?? 'Could not claim profile');
            }

            navigate('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not claim profile');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-background p-6 text-foreground">
            <NavBar />

            <div className="mx-auto mt-8 max-w-md">
                <Card>
                    <CardHeader>
                        <CardTitle>Claim Your Profile</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select your name">
                                        {(value) => drivers.find((d) => String(d.id) === value)?.name ?? null}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {drivers.map((driver) => (
                                        <SelectItem key={driver.id} value={String(driver.id)}>
                                            {driver.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {error && <p className="text-sm text-destructive">{error}</p>}

                            <Button type="submit" disabled={submitting || !selectedDriverId}>
                                {submitting ? 'Claiming…' : 'Claim Profile'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default ClaimProfilePage;