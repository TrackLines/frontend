import type { Metadata } from 'next';
import Link from 'next/link';
import { ClerkProvider, Show, UserButton } from '@clerk/nextjs';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Tracklines',
  description: 'Simple project boards and shareable roadmaps.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <ClerkProvider>
          <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-semibold tracking-tight">Tracklines</Link>
            <nav className="flex items-center gap-4" aria-label="Account">
              <Show when="signed-out">
                <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
                <Link href="/sign-up" className="text-sm font-medium hover:underline">Create account</Link>
              </Show>
              <Show when="signed-in"><UserButton /></Show>
            </nav>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
