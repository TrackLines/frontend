import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect('/dashboard');

  return (
    <main className="min-h-screen">
      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-16 pt-12 md:grid-cols-[1.2fr_.8fr] md:items-center md:pb-24 md:pt-20">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[.14em] text-primary">Project planning, made clear</p>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Work moves forward. Everyone can see where.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Plan work on simple boards, then share your roadmap with customers and teammates. Anyone you send a public roadmap link to can read it, no account required.
          </p>
          <Link href="/sign-in" className={buttonVariants({ size: 'lg' })}>
            Sign in to get started
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">Roadmap creation and project boards are coming soon.</p>
        </div>

        <Card className="border-primary/15 bg-card shadow-sm">
          <CardHeader>
            <CardDescription>A lighter way to keep work visible</CardDescription>
            <CardTitle className="text-xl">From next step to shared direction</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-4">
              <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold">1</span><span><strong className="font-medium">Plan the work</strong><span className="mt-1 block text-sm text-muted-foreground">Keep tasks on a board with clear, useful stages.</span></span></li>
              <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold">2</span><span><strong className="font-medium">Set direction</strong><span className="mt-1 block text-sm text-muted-foreground">Group milestones into a roadmap; dates can stay optional.</span></span></li>
              <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold">3</span><span><strong className="font-medium">Share a link</strong><span className="mt-1 block text-sm text-muted-foreground">Anyone with the link can read a public roadmap, no sign-in.</span></span></li>
            </ol>
          </CardContent>
        </Card>
      </section>

    </main>
  );
}
