import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';

const STEPS = [
  {
    title: 'Sign up',
    danger: false,
    where: 'Schedule page — browse and select an upcoming event',
    body: "Register interest in an event and pick a car class. This doesn't join a team yet — it's just \"I want to race this one.\"",
    points: [
      'One signup per event, per car class',
      'Guests can sign up too, without a full account',
    ],
  },
  {
    title: 'Form a team',
    danger: false,
    where: 'Race Planner page — "Create New Team Entry" or the Unassigned Drivers list',
    body: 'Create a team entry per class on the Race Planner page, or join an existing one from the Unassigned Drivers list.',
    points: [
      'Each car class needs its own team',
      'Leaving a team just un-joins you — your signup stays',
    ],
  },
  {
    title: 'Vote on car and timeslot',
    danger: false,
    where: "Race Planner page — each driver's Car and Availability sections",
    body: 'Every driver on the team votes for the cars and start times that work for them. Purely an interest signal.',
    points: [
      'Car votes can be multiple per driver',
      'Nothing is decided until someone clicks Confirm',
    ],
  },
  {
    title: 'Confirm car and timeslot',
    danger: false,
    where: 'Race Planner page — the team\'s "Car:" and "Timeslot:" rows',
    body: 'Anyone on the team can confirm the leading vote — this locks it in for the whole team.',
    points: [
      'No vote-count threshold required',
      'Always reversible — unlock and re-confirm if plans change mid-event',
    ],
  },
  {
    title: 'Mark blackout and avoid times',
    danger: true,
    where: 'Race Planner page (Blackout/Avoid section) or the Stint Planner\'s availability overview',
    body: "Drivers flag windows they can't drive (blackout) or shouldn't ideally (avoid — fatigue, very late for their timezone).",
    points: [
      "Entered in the driver's own local time, converted automatically",
      'Warnings only — a stint scheduled over a blackout still works, it just gets flagged',
    ],
  },
  {
    title: 'Build the stint schedule',
    danger: false,
    where: 'Stint Planner page — click "Stint Planner" next to a team on the Race Planner page',
    body: 'Set the race start (UTC), length, and practice/quali time, then assign and drag-reorder stints per driver.',
    points: [
      'Consecutive stints by the same driver merge into a "Double stint"',
      "The availability overview shows every driver's stints and blackout/avoid times on one timeline — click a red or yellow block to edit it",
    ],
  },
];

function RaceHelpPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How Race Planning Works</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          From signing up to building the stint schedule.
        </p>
        <div className="flex flex-col">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className={`flex gap-3 py-4 ${i < STEPS.length - 1 ? 'border-b border-input' : ''}`}
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                  step.danger ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'
                }`}
              >
                {i + 1}
              </div>
              <div>
                <p className="mb-1 font-medium">{step.title}</p>
                <p className="mb-1.5 inline-block rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                  {step.where}
                </p>
                <p className="mb-1.5 text-sm text-muted-foreground">{step.body}</p>
                <ul className="list-disc pl-4 text-sm text-muted-foreground">
                  {step.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default RaceHelpPage;
