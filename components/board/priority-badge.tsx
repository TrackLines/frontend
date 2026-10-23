import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Badge } from '@/components/ui/badge';

// Theme-aware priority badges (work in light and dark). Medium is the default, so cards hide it.
const PRIORITY: Record<string, { label: MessageDescriptor; className: string }> = {
  low: { label: msg`Low`, className: 'border-border text-muted-foreground' },
  medium: { label: msg`Medium`, className: 'border-border text-muted-foreground' },
  high: { label: msg`High`, className: 'border-amber-500/40 text-amber-600 dark:text-amber-400' },
  urgent: { label: msg`Urgent`, className: 'border-destructive/40 bg-destructive/10 text-destructive' },
};

export function PriorityBadge({ priority, hideDefault = false }: { priority?: string | null; hideDefault?: boolean }) {
  const { i18n } = useLingui();
  if (!priority || (hideDefault && priority === 'medium')) return null;
  const cfg = PRIORITY[priority];
  return <Badge variant="outline" className={cfg?.className ?? 'border-border text-muted-foreground'}>{cfg ? i18n._(cfg.label) : priority}</Badge>;
}
