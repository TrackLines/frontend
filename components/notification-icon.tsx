import { AtSignIcon, BanIcon, BellIcon, CircleCheckIcon, ClockIcon, EyeIcon, GaugeIcon, ShieldAlertIcon, Undo2Icon, UserPlusIcon, type LucideIcon } from 'lucide-react';
import type { NotificationKind } from '@/lib/api';
import { cn } from '@/lib/utils';

// Each notification type has its icon, so the bell's list can be scanned at a glance (TL-280); the
// ones asking for something (approve, act on capacity) are amber. An unknown kind gets the bell.
export const NOTIFICATION_ICONS: Record<NotificationKind, { icon: LucideIcon; label: string; urgent?: boolean }> = {
  assigned: { icon: UserPlusIcon, label: 'Assigned to you' },
  mention: { icon: AtSignIcon, label: 'Mentioned you' },
  finished: { icon: CircleCheckIcon, label: 'Finished' },
  wont_do: { icon: BanIcon, label: "Won't do" },
  review: { icon: EyeIcon, label: 'Needs your review' },
  sent_back: { icon: Undo2Icon, label: 'Sent back' },
  approval: { icon: ShieldAlertIcon, label: 'Needs your approval', urgent: true },
  retention: { icon: ClockIcon, label: 'Files due for deletion' },
  over_capacity: { icon: GaugeIcon, label: 'Sprint over capacity', urgent: true },
};

export function NotificationIcon({ kind, className }: { kind: string; className?: string }) {
  const known = NOTIFICATION_ICONS[kind as NotificationKind];
  const Icon = known?.icon ?? BellIcon;
  return (
    <span title={known?.label} data-kind={kind} className={cn('mt-0.5 shrink-0', known?.urgent ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground', className)}>
      <Icon className="size-4" aria-hidden />
    </span>
  );
}
