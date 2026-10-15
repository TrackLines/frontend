import type { PlanId, PlanInfo, Subscription } from './api';

// Plans (TL-290): Free 1 project, Pro 5, Enterprise unlimited. Prices come from Stripe (/api/plans).
export const PLAN_NAMES: Record<PlanId, string> = { free: 'Free', pro: 'Pro', enterprise: 'Enterprise' };

// planOf: the organization's plan; an older API without "plan" said only paid (then unlimited).
export const planOf = (s: Subscription): PlanId => s.plan ?? (s.paid ? 'enterprise' : 'free');

// projectsText: "1 project", "5 projects", "Unlimited projects".
export const projectsText = (limit: number | null) => (limit === null || limit < 0 ? 'Unlimited projects' : `${limit} project${limit === 1 ? '' : 's'}`);

// formatPrice: "£10 / month", "$0", or "" when there's no price to show.
export function formatPrice(price: PlanInfo['price']): string {
  if (!price) return '';
  if (price.amount === 0) return price.currency ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: price.currency, maximumFractionDigits: 0 }).format(0) : 'Free';
  const amount = new Intl.NumberFormat('en-GB', { style: 'currency', currency: price.currency, minimumFractionDigits: price.amount % 100 ? 2 : 0 }).format(price.amount / 100);
  return price.interval ? `${amount} / ${price.interval}` : amount;
}
