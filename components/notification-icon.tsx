import { AtSignIcon, BanIcon, BellIcon, CircleCheckIcon, ClockIcon, EyeIcon, GaugeIcon, ScaleIcon, ShieldAlertIcon, Undo2Icon, UserPlusIcon, type LucideIcon } from 'lucide-react';
import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import type { NotificationKind } from '@/lib/api';
import { cn } from '@/lib/utils';

// Each notification type has its icon, so the bell's list can be scanned at a glance (TL-280); the
// ones asking for something (approve, act on capacity) are amber. An unknown kind gets the bell.
export const NOTIFICATION_ICONS: Record<NotificationKind, { icon: LucideIcon; label: MessageDescriptor; urgent?: boolean }> = {
  assigned: { icon: UserPlusIcon, label: msg`Assigned to you` },
  mention: { icon: AtSignIcon, label: msg`Mentioned you` },
  finished: { icon: CircleCheckIcon, label: msg`Finished` },
  wont_do: { icon: BanIcon, label: msg`Won't do` },
  review: { icon: EyeIcon, label: msg`Needs your review` },
  sent_back: { icon: Undo2Icon, label: msg`Sent back` },
  approval: { icon: ShieldAlertIcon, label: msg`Needs your approval`, urgent: true },
  retention: { icon: ClockIcon, label: msg`Files due for deletion` },
  over_capacity: { icon: GaugeIcon, label: msg`Sprint over capacity`, urgent: true },
  legal: { icon: ScaleIcon, label: msg`Terms or Privacy policy updated` }, // TL-424
};

export function NotificationIcon({ kind, className }: { kind: string; className?: string }) {
  const { i18n } = useLingui();
  const known = NOTIFICATION_ICONS[kind as NotificationKind];
  const Icon = known?.icon ?? BellIcon;
  return (
    <span title={known && i18n._(known.label)} data-kind={kind} className={cn('mt-0.5 shrink-0', known?.urgent ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground', className)}>
      <Icon className="size-4" aria-hidden />
    </span>
  );
}
