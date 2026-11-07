import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

// Theme-aware priority badges (work in light and dark). Medium is the default, so cards hide it.
export const PRIORITY: Record<string, { label: MessageDescriptor; className: string }> = {
  low: { label: msg`Low`, className: 'border-border text-muted-foreground' },
  medium: { label: msg`Medium`, className: 'border-border text-muted-foreground' },
  high: { label: msg`High`, className: 'border-amber-500/40 text-amber-600 dark:text-amber-400' },
  urgent: { label: msg`Urgent`, className: 'border-destructive/40 bg-destructive/10 text-destructive' },
};

// PriorityBadge; explain adds a hover card saying what it means (TL-850). Not on board cards: the card
// is itself the link, and a link can't hold another.
export function PriorityBadge({ priority, hideDefault = false, explain = false }: { priority?: string | null; hideDefault?: boolean; explain?: boolean }) {
  const { t, i18n } = useLingui();
  if (!priority || (hideDefault && priority === 'medium')) return null;
  const cfg = PRIORITY[priority];
  const name = cfg ? i18n._(cfg.label) : priority;
  const badge = <Badge variant="outline" className={cfg?.className ?? 'border-border text-muted-foreground'}>{name}</Badge>;
  if (!explain) return badge;
  return (
    <HoverCard>
      <HoverCardTrigger render={<span tabIndex={0} aria-label={t`Priority: ${name}`} className="rounded-4xl outline-none focus-visible:ring-2 focus-visible:ring-ring" />}>{badge}</HoverCardTrigger>
      <HoverCardContent className="grid gap-1">
        <p className="font-medium"><Trans>Priority: {name}</Trans></p>
        <p className="text-muted-foreground"><Trans>How soon this needs doing. From most to least urgent: Urgent, High, Medium, Low.</Trans></p>
      </HoverCardContent>
    </HoverCard>
  );
}
