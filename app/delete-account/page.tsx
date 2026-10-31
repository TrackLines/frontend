import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Delete your account · TrackLin.es',
  description: 'How to delete your TrackLines account, and what happens to your data.',
};

// Public, as Google Play requires a web page for account deletion (TL-738). What's erased and kept here
// follows "How long we keep it" in the privacy policy: change both together.
export default function DeleteAccountPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Delete your TrackLines account</h1>
      <p className="mt-2 mb-8 text-muted-foreground">
        This is for your account in TrackLines, on the web at TrackLin.es and in the TrackLines Android app.
      </p>

      <h2 className="mt-8 text-xl font-semibold">How to delete it</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li><strong>In the Android app:</strong> open <strong>You</strong>, choose <strong>Delete account</strong>, and type DELETE to confirm.</li>
        <li><strong>If you can&apos;t use the app:</strong> ask us through the <Link href="/contact" className="underline">contact form</Link>, using the email address on your account.</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">What we erase</h2>
      <p className="mt-3">Your account details (name, email address and language), your notifications, device notification subscriptions, mentions, time away and the invitations you accepted. Your API keys stop working.</p>

      <h2 className="mt-8 text-xl font-semibold">What we keep</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li><strong>Your organization&apos;s work:</strong> what you added, such as tickets, comments, ticket history and audit log entries, stays with your organization for as long as it exists, but no longer shows your name.</li>
        <li><strong>Revoked API keys:</strong> a record that they existed (their name and a one-way hash, never the key itself).</li>
        <li><strong>Billing records:</strong> for as long as tax and accounting law requires.</li>
        <li><strong>Logs:</strong> for a short period, for security and troubleshooting.</li>
      </ul>

      <p className="mt-8 text-sm text-muted-foreground">
        The <Link href="/privacy" className="underline">privacy policy</Link> has the full details.
      </p>
    </main>
  );
}
