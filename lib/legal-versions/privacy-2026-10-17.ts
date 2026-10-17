// The Privacy policy as published on 17 October 2026 (TL-424). Published versions are
// never edited: a change is a new dated file, added to lib/legal-history.ts.
export default `
## The short version

- **We don't sell your data**, and we never will. We don't show ads and we don't run analytics or tracking scripts.
- **We store what you send us** (your projects, tickets, comments and files) and what we need to run the service, such as your name, email address and username.
- **You stay in control.** Delete a ticket and it goes, with its comments and attachments, 30 days later. Delete your organization and everything in it is permanently deleted 30 days later.
- **Credentials are encrypted.** Integration tokens are encrypted with a key that's kept outside the database, and API keys are stored only as a one-way hash, so nobody can read them by looking in the database.

## Who we are

TrackLin.es is run by Keloran Limited (trading as ChewedFeed), a company registered in England and Wales, company number 16481416 ("we", "us"). For the personal data in this policy we're the data controller under UK data protection law (the UK GDPR and the Data Protection Act 2018).

Your organization decides what goes into its projects. For that content we act on your organization's behalf, and its admins control it.

You can ask us anything about this policy through our [contact form](/contact).

## What we collect

- **Your account.** Sign-in is handled by Clerk. We receive your name, email address, username, profile picture and which organizations you belong to. We never see your password.
- **What you put in.** Projects, boards, tickets, comments, labels, roadmaps, files you attach, and anything else you or your team add, including @mentions.
- **Connections you set up.** Tokens for integrations such as BugFix.es, GitHub or Bitbucket, stored encrypted. API keys you create for AI agents or scripts, stored only as a hash and shown to you once.
- **Payments.** Card payments are handled by Stripe; we never see or store card numbers. We keep your plan and a reference to your Stripe customer record.
- **Notifications.** If you turn on notifications for a device, we store that device's push subscription so we can deliver them.
- **Google Chat.** If you link your account to the TrackLin.es app in Google Chat, we store your Google Chat user ID, the ID of your private chat with the app, and when you linked it. The one-time link the app sends you is stored only as a one-way hash and stops working after 30 minutes. We don't store your Google name, email address or anything you write in Google Chat: when you message the app, we read the message only to reply to it. If your organization's admins connect a team space, we store that space's webhook address, encrypted like other integration tokens.
- **Google Calendar.** If your organization's admins connect Google Calendar, we use access that your Google Workspace admin grants to read two things: each member's **Out of office** events, and, if the admins choose one, the all-day events on a shared calendar of company days off. From these we store only **when** someone is away: the start and end times, and whether it's a whole day. We never store an event's title, description, location or attendees, and we don't ask Google for them. We also store your Workspace domain, the admin email used to check access, and the ID of the company calendar.
- **Request forms.** If you send a request through a team's public form, we store what you type, the optional contact details you give, and a one-way hash of your network address. We use the hash only to limit abuse; it can't be turned back into your address.
- **Technical data.** Network addresses and request logs, used to keep the service secure, limit abuse and fix problems. Errors are reported to BugFix.es, our error-tracking service.

## How we use it

We use your data to provide TrackLin.es and support you, to keep the service secure and prevent abuse, to bill you if you're on a paid plan, to tell you about important changes to the service, and to meet our legal obligations.

Our legal bases are: providing the service you signed up for (contract); keeping it secure, preventing abuse and improving it (our legitimate interests); showing your team when you're away, from Google Calendar, so work isn't handed to someone on holiday (your organization's and our legitimate interests); keeping records the law requires (legal obligation); and your consent for device notifications and personal Google Chat messages, which you can turn off at any time.

We don't look at your content, except when you ask us to for support, when we need to keep the service secure, or when the law requires it.

## Who we share it with

We share data only with the companies that help us run TrackLin.es, and only what each one needs:

- **[Railway](https://railway.com)** hosts our servers and database.
- **[Clerk](https://clerk.com)** handles sign-in and organizations.
- **[Stripe](https://stripe.com)** handles payments.
- **[UploadThing](https://uploadthing.com)** stores the files you attach.
- **[Google](https://workspace.google.com)** delivers Google Chat messages. If you've linked your account, your notifications go to your private chat with the TrackLin.es app; if your organization connected a team space, its notifications go there. Each message says who did what, with the ticket's key and title and a link to it. If your organization connects Google Calendar, Google gives us the dates of Out of office events, as described above. To read your calendar, we send Google only your email address in your organization's Workspace.
- **Push services** run by browser makers (Google, Mozilla, Apple and Microsoft) deliver device notifications. The contents are encrypted, so they can't read them.
- **[Flags.gg](https://flags.gg)** turns features on and off. It receives none of your content.
- **[BugFix.es](https://bugfix.es)** receives reports of errors in TrackLin.es.
- **ChewedFeed HQ**, our own customer records, receives the name, email address and plan of paying customers.

When your organization connects an integration (such as GitHub, Bitbucket or BugFix.es) or gives an AI agent an API key, data flows to that service as you've set it up. That service's own terms and policies then apply.

We may also disclose data when the law requires it, or to protect our users or the service. If the business is ever sold or merged, your data would move with it, under this policy.

## International transfers

Some of these providers are based in, or process data in, the United States and other countries outside the UK. When data leaves the UK, it's protected by the safeguards UK law requires, such as the UK International Data Transfer Agreement, the UK Addendum to the EU standard contractual clauses, or the UK Extension to the EU–US Data Privacy Framework.

## How long we keep it

- **Your account and content** for as long as your account and organization exist.
- **Deleted tickets and attachments** disappear from TrackLin.es at once and are kept for 30 days, so a mistake can be undone if you contact us. After that they're permanently deleted, files included.
- **Attachments** are kept for a year. After that your organization's admins and the person who uploaded a file are told, and anyone of them can keep it for another year; otherwise it's deleted at 13 months.
- **Deleted organizations** are kept for 30 days, so an accidental deletion can be undone if you contact us. After that, everything in them, files included, is permanently deleted.
- **Your Google Chat link** until you unlink it (in Your settings), remove the app in Google Chat, or delete your account. Unused one-time links are deleted once they've expired.
- **Time away from Google Calendar**: from a week ago up to 90 days ahead. Each hourly sync replaces it with what's in Google, so changed or cancelled leave is corrected, and leave that ended over a week ago is deleted. All of it is deleted when your organization disconnects Google Calendar. Your own entries are deleted when you leave the organization.
- **Billing records** for as long as tax and accounting law requires.
- **Logs** for a short period, for security and troubleshooting.

## Security

All traffic to and from TrackLin.es is encrypted. Credentials are encrypted or hashed as described above. Access is limited to people in your organization and by the permissions your admins set. No system is perfectly secure; if a breach ever affects your data, we'll tell you and the regulator as the law requires.

## Cookies

We use only the cookies needed to keep you signed in, which are set by Clerk. Your browser also stores a few preferences on your device, such as your theme and roadmap view. There are no analytics or advertising cookies, so there's nothing to opt out of.

## Your rights

Under UK data protection law you can ask to see the personal data we hold about you, correct it, delete it, receive a copy in a portable format, restrict or object to how we use it, and withdraw consent where we rely on it. Send your request through our [contact form](/contact) and we'll respond within a month.

If you're unhappy with how we've handled your data, you can complain to the Information Commissioner's Office at [ico.org.uk](https://ico.org.uk). We'd appreciate the chance to put it right first.

## Children

TrackLin.es is a work tool and isn't meant for children under 13. We don't knowingly collect their data, and if we learn we have, we'll delete it.

## Changes to this policy

If we make a meaningful change, we'll update the date at the top and tell you in TrackLin.es or by email before it takes effect.
`;
