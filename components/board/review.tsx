'use client';

import { useState } from 'react';
import { EyeIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ApiError, boards, tickets, type Ticket } from '@/lib/api';

// Needs review: on a board with agent review, an agent's finished ticket waits in the column before
// Done (review_requested_at) until a person approves it or sends it back.

export function NeedsReviewBadge({ ticket }: { ticket: Pick<Ticket, 'review_requested_at'> }) {
  if (!ticket.review_requested_at) return null;
  return (
    <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400" title="An agent finished this; a person needs to approve it">
      <EyeIcon aria-hidden /> Needs review
    </Badge>
  );
}

// AgentReviewSetting: the board setting (Edit board mode), like Style and Estimates.
export function AgentReviewSetting({ boardId, on, token, onChanged }: { boardId: string; on: boolean; token: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function change(next: boolean) {
    setBusy(true);
    setError('');
    try {
      await boards.update(boardId, { agent_review: next }, token);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? 'Only organization admins and the board’s team leaders can change this.' : 'Couldn’t change agent review. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground" title="When an AI agent moves a ticket to Done, it waits for a person to approve it">Agent work needs review</span>
      <ToggleGroup size="sm" variant="outline" aria-label="Agent work needs review" disabled={busy} value={[on ? 'on' : 'off']}
        onValueChange={(v) => { if (v[0] && (v[0] === 'on') !== on) void change(v[0] === 'on'); }}>
        <ToggleGroupItem value="off">Off</ToggleGroupItem>
        <ToggleGroupItem value="on">On</ToggleGroupItem>
      </ToggleGroup>
      {error && <span role="alert" className="text-destructive">{error}</span>}
    </div>
  );
}

// ReviewActions: Approve (to Done) or Send back (to the first column, with a comment). Shown only
// while the ticket waits for review.
export function ReviewActions({ ticket, token, onReviewed }: { ticket: Pick<Ticket, 'id' | 'review_requested_at'>; token: string; onReviewed: () => void }) {
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
      setError(err instanceof ApiError && err.status === 409 ? 'This ticket isn’t waiting for review any more.' : 'Couldn’t save the review. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Review" className="grid gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
      <p><strong>Needs review.</strong> An agent finished this. Approve it to move it to Done, or send it back with what&apos;s missing.</p>
      {sending === null ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={() => void review(true)}>{busy ? 'Saving…' : 'Approve'}</Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setSending('')}>Send back</Button>
        </div>
      ) : (
        <div className="grid gap-2">
          <label className="grid gap-1.5 font-medium">
            <span>What needs doing <span className="font-normal text-muted-foreground">(added as a comment)</span></span>
            <textarea value={sending} rows={2} maxLength={10000} onChange={(e) => setSending(e.target.value)}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="destructive" disabled={busy || !sending.trim()} onClick={() => void review(false, sending)}>{busy ? 'Sending…' : 'Send back'}</Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setSending(null)}>Cancel</Button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </section>
  );
}
