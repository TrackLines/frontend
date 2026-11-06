import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// SettingsCard: one Settings panel, laid out like the dashboard's project cards. With href the whole
// card is the link: a link laid over it, so the card can still hold its own links and buttons (API keys:
// "Your settings", Connect AI), which sit above it with `relative z-10`. Without href, children are its
// actions. wide: a panel holding a form or a list (edit project's request form, repositories) takes the whole row.
export function SettingsCard({ icon: Icon, title, description, badge, href, wide = false, children }: {
  icon: LucideIcon; title: string; description: ReactNode; badge?: ReactNode; href?: string; wide?: boolean; children?: ReactNode;
}) {
  const card = (
    <Card className={`h-full ${href ? 'transition-colors group-hover:bg-muted/40' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" aria-hidden /></span>
          <span>{title}</span>
          {badge && <span className="ml-auto">{badge}</span>}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {children && <CardContent className={`${wide ? 'grid gap-3' : 'mt-auto flex flex-wrap items-center gap-2'} ${href ? 'relative z-10' : ''}`}>{children}</CardContent>}
    </Card>
  );
  return (
    <li className={`${wide ? 'sm:col-span-2 lg:col-span-3' : ''} ${href ? 'group relative' : ''}`.trim() || undefined}>
      {href && <Link href={href} aria-label={title} className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-ring" />}
      {card}
    </li>
  );
}
