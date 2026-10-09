import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ago } from '@/lib/ago';
import type { Board } from '@/lib/api';
import { DoneBar, UrgentBadge } from './project-card';

// BoardCard is one team board on a project page: urgent count, sprint, where the work is, progress.
export function BoardCard({ board: b }: { board: Board }) {
  const st = b.stats;
  return (
    <li>
      <Link href={`/boards/${b.id}`} className="group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-ring">
        <Card className="h-full transition-colors group-hover:bg-muted/40">
          <CardHeader>
            <CardTitle className="flex items-start justify-between gap-2">
              <span>{b.name}</span>
              {st && <UrgentBadge count={st.urgent} />}
            </CardTitle>
            {b.description && <CardDescription className="line-clamp-2">{b.description}</CardDescription>}
          </CardHeader>
          {st && (
            <CardContent className="mt-auto grid gap-3 text-sm">
              {st.sprint_number !== null && (
                <p className="font-medium">Sprint {st.sprint_number}{st.sprint_ends_at && <span className="font-normal text-muted-foreground"> · ends {ago(st.sprint_ends_at)}</span>}</p>
              )}
              {st.open + st.done === 0 ? (
                <p className="text-muted-foreground">No tickets yet.</p>
              ) : (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                  <span>{st.open - st.in_progress} to do</span>
                  <span>{st.in_progress} in progress</span>
                </div>
              )}
              <DoneBar done={st.done} total={st.open + st.done} />
              <p className="text-xs text-muted-foreground">Active {ago(st.active)}</p>
            </CardContent>
          )}
        </Card>
      </Link>
    </li>
  );
}
