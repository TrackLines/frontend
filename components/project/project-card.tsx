import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress, ProgressLabel } from '@/components/ui/progress';
import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { ago } from '@/lib/i18n/ago';
import type { Project } from '@/lib/api';

// ProjectCard is one project on the projects page: name, urgent count, sizes and progress.
export function ProjectCard({ project: p }: { project: Project }) {
  const { i18n } = useLingui();
  const st = p.stats;
  const total = st ? st.open + st.done : 0;
  return (
    <li>
      <Link href={`/projects/${p.id}`} className="group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-ring">
        <Card className="h-full transition-colors group-hover:bg-muted/40">
          <CardHeader>
            <CardTitle className="flex items-start justify-between gap-2">
              <span>{p.name}</span>
              {st && <UrgentBadge count={st.urgent} />}
            </CardTitle>
            {p.description && <CardDescription className="line-clamp-2">{p.description}</CardDescription>}
          </CardHeader>
          {st && (
            <CardContent className="mt-auto grid gap-3 text-sm">
              {st.boards === 0 && st.backlog === 0 ? (
                <p className="text-muted-foreground"><Trans>No boards yet.</Trans></p>
              ) : (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                  <span><Plural value={st.boards} one="# board" other="# boards" /></span>
                  <span><Trans>{st.open} open</Trans></span>
                  <span><Trans>{st.backlog} in backlog</Trans></span>
                  {st.roadmaps > 0 && <span><Plural value={st.roadmaps} one="# roadmap" other="# roadmaps" /></span>}
                </div>
              )}
              <DoneBar done={st.done} total={total} />
              <p className="text-xs text-muted-foreground"><Trans>Active {ago(i18n, st.active)}</Trans></p>
            </CardContent>
          )}
        </Card>
      </Link>
    </li>
  );
}


// UrgentBadge flags open urgent tickets; nothing when there are none.
export function UrgentBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return <Badge variant="outline" className="shrink-0 border-destructive/40 bg-destructive/10 text-destructive"><Trans>{count} urgent</Trans></Badge>;
}

// DoneBar shows how many tickets are done; nothing when there are none.
export function DoneBar({ done, total }: { done: number; total: number }) {
  const { t } = useLingui();
  if (total === 0) return null;
  return (
    <Progress value={done} max={total} aria-label={t`Tickets done`} className="gap-1">
      <ProgressLabel className="order-last text-xs font-normal text-muted-foreground"><Trans>{done} of {total} done</Trans></ProgressLabel>
    </Progress>
  );
}
