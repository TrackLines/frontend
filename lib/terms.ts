import { LEGAL, companyLine } from '@/lib/legal';

// The terms of service (TL-203). Plans, prices and deletion here must match the product: keep them in
// step with billing (Free: 1 project; Pro: $10 a month) and the ${LEGAL.retentionDays}-day organization purge.
export const TERMS = `
These terms are an agreement between you and ${companyLine()} ("we", "us") about your use of Tracklines. By creating an account or using Tracklines, you agree to them. If you use Tracklines for an organization, you confirm you're allowed to agree on its behalf, and "you" includes that organization.

## 1. Your account

- You need to be at least 13, and to give accurate details when you sign up.
- You're responsible for what happens under your account and in your organization, including the actions of people you invite and of AI agents or scripts you give an API key. An API key acts as you, so keep it as safe as a password, and revoke it if it might have leaked.
- Your organization's admins decide who's in it and what they can do.

## 2. Your content

Everything you put into Tracklines (projects, tickets, comments, files, roadmaps and so on) stays yours. You give us permission to store, copy and display it only as needed to run Tracklines for you, for example to show it to your team, deliver notifications, or send it to integrations you've connected. We don't sell it and we don't use it to advertise.

You're responsible for having the right to everything you put in, and for it being lawful.

## 3. Public pages

You can choose to share some things publicly: a roadmap set to public, or a request form for your customers. Anyone with the link can see or use these, without an account. You're responsible for what you publish, and for how you handle the requests people send you.

## 4. Acceptable use

Don't use Tracklines to:

- break the law, or infringe anyone's rights;
- send spam or malware, or harass anyone;
- try to get into accounts, organizations or data that aren't yours, probe or overload our systems, or get around limits or security;
- copy or resell Tracklines, or use it to build a competing product.

We may suspend accounts or remove content that breaks these rules. Where it's reasonable, we'll tell you first and give you a chance to fix it.

## 5. Integrations and AI agents

Tracklines can connect to other services, such as GitHub, Bitbucket, Bugfixes, and AI agents through our MCP server and API. When you connect one, data moves between Tracklines and that service as you've set it up, and that service's own terms apply. We aren't responsible for third-party services or for the work AI agents do; check their changes as you would anyone else's.

## 6. Plans and payment

- **Free** includes one project, with as many boards, tickets and roadmaps as you like inside it.
- **Pro** costs $10 a month, plus any applicable taxes, and includes unlimited projects. It's billed monthly in advance through Stripe and renews automatically until you cancel.
- **Cancelling:** you can cancel any time from Settings. You keep Pro until the end of the month you've paid for, and then move to Free. We don't give refunds for part-used months.
- **Price changes:** we'll give you at least 30 days' notice before a price change applies to you.
- **Failed payments:** if a payment fails and isn't sorted out, we may move you to Free.

Nothing in these terms affects your rights under consumer law, if they apply to you.

## 7. Changes to Tracklines

We're constantly improving Tracklines, so features will change. Some features may be marked as in preview or turned on gradually; those may change or go away. If we ever plan to remove something central to how you use Tracklines, we'll tell you in advance.

## 8. Ending your use

You can stop using Tracklines and delete your organization at any time. A deleted organization's data is kept for ${LEGAL.retentionDays} days, in case it was a mistake, and then permanently deleted. Our [privacy policy](/privacy) explains what we keep and for how long.

We may suspend or end your access if you seriously or repeatedly break these terms, if we have to by law, or if we stop offering Tracklines. If we stop offering it, we'll give you reasonable notice so you can take your data with you.

## 9. Disclaimers

We work hard to keep Tracklines running and your data safe. However, Tracklines is provided "as is" and "as available". To the extent the law allows, we don't promise it will always be available, error-free or suitable for any particular purpose. Keep your own copies of anything you can't afford to lose.

## 10. Our liability

Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or for anything else that can't legally be limited.

Otherwise, to the extent the law allows:

- we aren't liable for indirect or consequential losses, or for lost profits, revenue, data or goodwill;
- our total liability to you for anything to do with Tracklines is limited to the greater of what you've paid us in the 12 months before the claim and £100.

## 11. Your responsibility to us

If someone makes a claim against us because of content you put into Tracklines, or because you broke these terms, you'll cover our reasonable costs of dealing with it.

## 12. Changes to these terms

We may update these terms. If a change matters, we'll tell you in Tracklines or by email at least 30 days before it takes effect. If you keep using Tracklines after that, the new terms apply; if you don't agree, you can stop using it and delete your organization.

## 13. General

These terms are governed by the law of ${LEGAL.law}, and the courts of ${LEGAL.law} decide any disputes. If you're a consumer living elsewhere in the UK, you can also bring proceedings in your local courts.

If a part of these terms can't be enforced, the rest still applies. If we don't enforce something straight away, we can still enforce it later. You can't transfer these terms to someone else without our agreement; we may transfer them if the business changes hands, in which case your rights continue.

Questions? Email [${LEGAL.contact}](mailto:${LEGAL.contact}).
`;
