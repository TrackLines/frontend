import { Badge } from '@/components/ui/badge';

// Theme-aware priority badges (work in light and dark). Medium is the default, so cards hide it.
const PRIORITY: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'border-border text-muted-foreground' },
  medium: { label: 'Medium', className: 'border-border text-muted-foreground' },
  high: { label: 'High', className: 'border-amber-500/40 text-amber-600 dark:text-amber-400' },
  urgent: { label: 'Urgent', className: 'border-destructive/40 bg-destructive/10 text-destructive' },
};

export function PriorityBadge({ priority, hideDefault = false }: { priority?: string | null; hideDefault?: boolean }) {
  if (!priority || (hideDefault && priority === 'medium')) return null;
  const cfg = PRIORITY[priority] ?? { label: priority, className: 'border-border text-muted-foreground' };
  return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>;
}
