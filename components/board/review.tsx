'use client';

import { MarkdownTextarea } from '@/components/common/markdown';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { EyeIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ApiError, boards, tickets, type Ticket } from '@/lib/api';

// Needs review: on a board with agent review, an agent's finished ticket waits in the column before
// Done (review_requested_at) until a person approves it or sends it back.

export function NeedsReviewBadge({ ticket }: { ticket: Pick<Ticket, 'review_requested_at'> }) {
  const { t } = useLingui();
  if (!ticket.review_requested_at) return null;
  return (
    <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400" title={t`An agent finished this; a person needs to approve it`}>
      <EyeIcon aria-hidden /> <Trans>Needs review</Trans>
    </Badge>
  );
}

// ReviewActions: Approve (to Done) or Send back (to the first column, with a comment). Shown only
// while the ticket waits for review.
export function ReviewActions({ ticket, token, onReviewed }: { ticket: Pick<Ticket, 'id' | 'review_requested_at'>; token: string; onReviewed: () => void }) {
  const { t } = useLingui();
  const [sending, setSending] = useState<string | null>(null); // the comment, while sending back
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!ticket.review_requested_at) return null;

  async function review(approve: boolean, comment = '') {
    setBusy(true);
    setError('');
    try {
      await tickets.review(ticket.id, approve, comment, token);
      setSending(null);
      onReviewed();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? t`This ticket isn’t waiting for review any more.` : t`Couldn’t save the review. Please try again.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label={t`Review`} className="grid gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
      <p><Trans><strong>Needs review.</strong> An agent finished this. Approve it to move it to Done, or send it back with what&apos;s missing.</Trans></p>
      {sending === null ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={() => void review(true)}>{busy ? t`Saving…` : t`Approve`}</Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setSending('')}><Trans>Send back</Trans></Button>
        </div>
      ) : (
        <div className="grid gap-2">
          <label className="grid gap-1.5 font-medium">
            <span><Trans>What needs doing <span className="font-normal text-muted-foreground">(added as a comment)</span></Trans></span>
            <MarkdownTextarea mentions={token} value={sending} rows={2} maxLength={10000} onChange={(e) => setSending(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="destructive" disabled={busy || !sending.trim()} onClick={() => void review(false, sending)}>{busy ? t`Sending…` : t`Send back`}</Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setSending(null)}><Trans>Cancel</Trans></Button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </section>
  );
}
