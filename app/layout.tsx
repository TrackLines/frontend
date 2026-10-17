import type { Metadata } from 'next';
import { SiteFooter } from '@/components/site-footer';
import { ScrollToTop } from '@/components/scroll-to-top';
import Image from 'next/image';
import Link from 'next/link';
import { headers } from 'next/headers';
import { ClerkProvider, Show } from '@clerk/nextjs';
import { shadcn } from '@clerk/themes';
import { ThemeProvider } from 'next-themes';
import { ThemeChooser } from '@/components/theme-chooser';
import { UserMenu } from '@/components/user-menu';
import { QuickAddTicket } from '@/components/quick-add-ticket';
import { TicketSearch } from '@/components/ticket-search';
import { NotificationsBell } from '@/components/notifications-bell';
import { CompleteInvitations } from '@/components/complete-invitations';
import { CacheGuard } from '@/components/cache-guard';
import { OrgSwitcher } from '@/components/org-switcher';
import { FeatureFlags } from '@/components/feature-flags';
import { Toaster } from '@/components/ui/sonner';
import { ErrorReporter } from '@/components/error-reporter';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'TrackLin.es',
  description: 'Simple project boards and shareable roadmaps.',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // the strict CSP (Clerk middleware, TL-255) allows only inline scripts carrying this request's nonce:
  // next-themes' script (theme before first paint) needs it, or the browser blocks it on every page
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    // suppressHydrationWarning: next-themes sets the theme class on <html> before React hydrates
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="tracklines-theme" nonce={nonce}>
        <ClerkProvider dynamic appearance={{ theme: shadcn }}>
        <FeatureFlags>
          <CacheGuard />
          <Show when="signed-in"><CompleteInvitations /></Show>
          <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 print:hidden">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
                {/* the logo on its dark tile: its white ring would vanish on a light background */}
                <Image src="/logo-tile.png" alt="" width={28} height={28} className="size-7 rounded-md" priority />
                TrackLin.es
              </Link>
              <Show when="signed-in"><OrgSwitcher /></Show>
            </div>
            <nav className="flex items-center gap-4" aria-label="Account">
              {/* QuickAddTicket only renders on some pages, so it goes first: the toggle and avatar never move */}
              <Show when="signed-in"><QuickAddTicket /></Show>
              <Show when="signed-in"><TicketSearch /></Show>
              <Show when="signed-in"><NotificationsBell /></Show>
              <ThemeChooser />
              <Show when="signed-out">
                <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
                <Link href="/sign-up" className="text-sm font-medium hover:underline">Create account</Link>
              </Show>
              <Show when="signed-in"><UserMenu /></Show>
            </nav>
          </header>
          {children}
          <SiteFooter />
          <ScrollToTop />
          {/* bottom left: the hosted drawer and its buttons are on the right */}
          <Toaster position="bottom-left" offset={8} mobileOffset={8} />
          <ErrorReporter />
        </FeatureFlags>
        </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
