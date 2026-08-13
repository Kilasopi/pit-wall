import { useState } from "react";
import { X } from 'lucide-react';
import { useRaceEventSignups } from "@/hooks/useRaceEventSignups";
import { RaceEventSignupForm } from "./RaceEventSignupForm";
import { RELAY_HTTP_URL } from '@/lib/relay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function labelFor(signup) {
    return signup.driver_id ? (signup.driver_nickname || signup.driver_name) : signup.guest_name;
}

export function EventSignups({ raceEventId, carClasses }) {
    const { signups, refetch } = useRaceEventSignups(raceEventId);
    const [showForm, setShowForm] = useState(false);

    function removeSignup(id) {
        fetch(`${RELAY_HTTP_URL}/api/race-event-signups/${id}`, { method: 'DELETE' }).then(() => refetch());
    }

    const byClass = signups.reduce((acc, s) => {
        (acc[s.car_class] ??= []).push(s);
        return acc;
    }, {});

    return (
        <div className="mt-2 border-t pt-2">
            {Object.entries(byClass).map(([carClass, group]) => (
                <div key={carClass} className="mb-1 flex flex-wrap items-center gap-1 text-sm">
                    <span className="text-sm text-muted-foreground">{carClass}:</span>
                    {group.map((s) => (
                        <Badge key={s.id} variant="secondary" className="h-7 gap-1 pr-1 text-sm">
                            {labelFor(s)}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => removeSignup(s.id)}
                                aria-label={`Remove ${labelFor(s)}`}
                                className="size-5"
                            >
                                <X className="size-3.5" />
                            </Button>
                        </Badge>
                    ))}
                </div>
            ))}

            {showForm ? (
                <RaceEventSignupForm
                    raceEventId={raceEventId}
                    carClasses={carClasses}
                    onAdded={() => { refetch(); setShowForm(false); }}
                    onCancel={() => setShowForm(false)}
                />
            ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
                    Register
                </Button>
            )}
        </div>
    );
}