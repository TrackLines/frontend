import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// SettingsCard: one Settings panel, laid out like the dashboard's project cards. With href the whole
// card is the link; otherwise children are its actions (buttons can't sit inside a link). wide: a
// panel holding a form or a list (edit project's request form, repositories) takes the whole row.
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
      {children && <CardContent className={wide ? 'grid gap-3' : 'mt-auto flex flex-wrap items-center gap-2'}>{children}</CardContent>}
    </Card>
  );
  return (
    <li className={wide ? 'sm:col-span-2 lg:col-span-3' : undefined}>
      {href ? <Link href={href} className="group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-ring">{card}</Link> : card}
    </li>
  );
}
