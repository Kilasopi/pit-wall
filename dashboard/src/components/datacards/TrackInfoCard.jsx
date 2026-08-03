import { MapPin } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

export function TrackInfoCard({
    Track
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="size-4" />
          Track: {Track?.name ?? '—'}
        </CardTitle>
        <CardDescription>No session data yet</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Track info goes here.
        </p>
      </CardContent>
    </Card>
  );
}
