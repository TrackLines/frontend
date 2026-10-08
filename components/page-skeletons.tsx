import { Skeleton } from '@/components/ui/skeleton';

// Page-shaped placeholders: shown by each route's loading.tsx on navigation and by the page
// while its data loads, so it looks like it's loading rather than blank.

function Loading({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <main className={className} role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div aria-hidden className="contents">{children}</div>
    </main>
  );
}

export function BoardSkeleton() {
  return (
    <Loading label="Loading board…" className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
      <div className="flex items-center gap-4 border-b px-6 py-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="ml-auto h-8 w-24" />
      </div>
      <div className="flex flex-1 items-start gap-4 overflow-hidden p-6">
        {[4, 2, 3].map((cards, i) => (
          <div key={i} className="grid w-[30%] shrink-0 gap-3 rounded-xl bg-muted/40 p-3">
            <Skeleton className="h-5 w-24" />
            {Array.from({ length: cards }, (_, j) => (
              <div key={j} className="grid gap-2 rounded-lg border bg-card p-3">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Loading>
  );
}

export function TicketSkeleton() {
  return (
    <Loading label="Loading ticket…" className="mx-auto grid max-w-6xl gap-6 px-6 py-10">
      <Skeleton className="h-4 w-56" />
      <div className="grid gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-2 rounded-xl border p-5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ))}
    </Loading>
  );
}

export function ProjectSkeleton() {
  return (
    <Loading label="Loading project…" className="mx-auto max-w-6xl px-6 py-10">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-3 h-9 w-64" />
      <Skeleton className="mt-10 h-6 w-24" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="mt-10 h-6 w-28" />
      <ListSkeleton className="mt-4" />
    </Loading>
  );
}

// ListSkeleton: rows for lists that load inside a page (e.g. the backlog).
export function ListSkeleton({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={`divide-y rounded-xl border ${className}`}>
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} aria-hidden className="flex items-center gap-3 p-4">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-8 w-28" />
        </div>
      ))}
    </div>
  );
}
