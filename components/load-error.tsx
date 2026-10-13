import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

// LoadError: a page whose ticket, board, project or roadmap couldn't be loaded. 404 (or 403) says it's
// gone or in another organization (never which); anything else asks for a refresh.
export function LoadError({ status, thing }: { status: number; thing: 'ticket' | 'board' | 'project' | 'roadmap' }) {
  const missing = status === 404 || status === 403;
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{missing ? `${thing[0].toUpperCase()}${thing.slice(1)} not found` : `Couldn't load this ${thing}`}</h1>
      <p className="text-muted-foreground">{missing ? 'It may have been deleted, or it belongs to another organization.' : 'Please refresh to try again.'}</p>
      <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>Back to projects</Link>
    </main>
  );
}
