import { ListChecksIcon } from 'lucide-react';
import { checklistCount } from '@/lib/checklist';

// ChecklistCount: "7/19" for a ticket whose details have a checklist; nothing otherwise.
export function ChecklistCount({ markdown, className = '' }: { markdown: string; className?: string }) {
  const { done, total } = checklistCount(markdown);
  if (total === 0) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs tabular-nums ${done === total ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'} ${className}`}
      title="Checklist" aria-label={`Checklist: ${done} of ${total} done`}>
      <ListChecksIcon className="size-3.5" aria-hidden /> {done}/{total}
    </span>
  );
}
