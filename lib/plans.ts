import type { PlanId, PlanInfo, Subscription } from './api';

// Plans (TL-290, TL-418): Free 1 project, Pro 5, Enterprise unlimited; Free and Pro up to 20 members,
// Enterprise unlimited. Prices come from Stripe (/api/plans).
export const PLAN_NAMES: Record<PlanId, string> = { free: 'Free', pro: 'Pro', enterprise: 'Enterprise' };

// planOf: the organization's plan; an older API without "plan" said only paid (then unlimited).
export const planOf = (s: Subscription): PlanId => s.plan ?? (s.paid ? 'enterprise' : 'free');

// projectsText: "1 project", "5 projects", "Unlimited projects".
export const projectsText = (limit: number | null) => (limit === null || limit < 0 ? 'Unlimited projects' : `${limit} project${limit === 1 ? '' : 's'}`);

// MEMBER_LIMIT: Free's and Pro's member cap (backend billing.MemberLimit; Clerk's own cap without its add-on).
export const MEMBER_LIMIT = 20;

// membersText: "up to 20 members", "unlimited members".
export const membersText = (limit: number | null | undefined) => (limit == null || limit < 0 ? 'unlimited members' : `up to ${limit} members`);

// formatPrice: "£10 / month", "$0", or "" when there's no price to show.
export function formatPrice(price: PlanInfo['price']): string {
  if (!price) return '';
  if (price.amount === 0) return price.currency ? new Intl.NumberFormat('en-US', { style: 'currency', currency: price.currency, maximumFractionDigits: 0 }).format(0) : 'Free';
  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: price.currency, minimumFractionDigits: price.amount % 100 ? 2 : 0 }).format(price.amount / 100);
  return price.interval ? `${amount} / ${price.interval}` : amount;
}
