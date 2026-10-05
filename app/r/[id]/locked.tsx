import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

// Shown when a roadmap is login-only and the visitor isn't signed in.
export function Locked({ id }: { id: string }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Sign in to view this roadmap</h1>
      <p className="text-muted-foreground">The owner has shared this roadmap with signed-in users only.</p>
      <Link href={`/sign-in?redirect_url=${encodeURIComponent(`/r/${id}`)}`} className={buttonVariants()}>
        Sign in
      </Link>
    </main>
  );
}
