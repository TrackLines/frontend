import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ago } from '@/lib/ago';
import type { Project } from '@/lib/api';

// ProjectCard is one project on the projects page: name, urgent count, sizes and progress.
export function ProjectCard({ project: p }: { project: Project }) {
  const st = p.stats;
  const total = st ? st.open + st.done : 0;
  return (
    <li>
      <Link href={`/projects/${p.id}`} className="group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-ring">
        <Card className="h-full transition-colors group-hover:bg-muted/40">
          <CardHeader>
            <CardTitle className="flex items-start justify-between gap-2">
              <span>{p.name}</span>
              {st && st.urgent > 0 && <Badge variant="outline" className="shrink-0 border-destructive/40 bg-destructive/10 text-destructive">{st.urgent} urgent</Badge>}
            </CardTitle>
            {p.description && <CardDescription className="line-clamp-2">{p.description}</CardDescription>}
          </CardHeader>
          {st && (
            <CardContent className="mt-auto grid gap-3 text-sm">
              {st.boards === 0 && st.backlog === 0 ? (
                <p className="text-muted-foreground">No boards yet.</p>
              ) : (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                  <span>{plural(st.boards, 'board')}</span>
                  <span>{st.open} open</span>
                  <span>{st.backlog} in backlog</span>
                  {st.roadmaps > 0 && <span>{plural(st.roadmaps, 'roadmap')}</span>}
                </div>
              )}
              {total > 0 && (
                <div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Board tickets done" aria-valuemin={0} aria-valuemax={total} aria-valuenow={st.done}>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(st.done / total) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{st.done} of {total} done</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Active {ago(st.active)}</p>
            </CardContent>
          )}
        </Card>
      </Link>
    </li>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

