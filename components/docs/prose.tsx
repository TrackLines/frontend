import Link from 'next/link';
import type { ReactNode } from 'react';

// The pieces every docs guide is made of, so they read the same.
export function Guide({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <article className="max-w-3xl">
        <Link href="/docs" className="text-sm text-muted-foreground hover:underline">← Docs</Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <P>{intro}</P>
        {children}
      </article>
    </main>
  );
}
export const H2 = ({ children }: { children: ReactNode }) => <h2 className="mt-10 text-xl font-semibold">{children}</h2>;
export const P = ({ children }: { children: ReactNode }) => (
  <p className="mt-2 text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-foreground">{children}</p>
);
export const Steps = ({ children }: { children: ReactNode }) => <ol className="mt-2 grid list-decimal gap-1.5 pl-5 text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-foreground">{children}</ol>;
export const Items = ({ children }: { children: ReactNode }) => <ul className="mt-2 grid list-disc gap-1.5 pl-5 text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-foreground">{children}</ul>;
// Code is a command or file to copy, styled like the MCP guide's setup steps.
export const Code = ({ children }: { children: string }) => (
  <pre className="mt-2 overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-5 text-foreground">{children}</pre>
);
export const B = ({ children }: { children: ReactNode }) => <strong className="text-foreground">{children}</strong>;
