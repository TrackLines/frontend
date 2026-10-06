'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import type { TicketComment } from '@/lib/api';
import { ticketComments } from '@/lib/api';
import { personLabel } from '@/lib/people';
import { commentThread, type CommentNode } from './comment-thread';

const maxLength = 10000;
const commentDate = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC',
});

export function TicketComments({ ticketId, token }: { ticketId: string; token: string }) {
  const [comments, setComments] = useState<TicketComment[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<TicketComment | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');

  useEffect(() => {
    let current = true;
    setComments(null);
    setLoadFailed(false);
    ticketComments.list(ticketId, token).then(
      (list) => { if (current) setComments(list); },
      () => { if (current) setLoadFailed(true); },
    );
    return () => { current = false; };
  }, [ticketId, token, retry]);

  async function post(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = body.trim();
    if (!clean || posting) return;
    setPosting(true);
    setPostError('');
    try {
      const created = await ticketComments.create(ticketId, clean, token, replyTo?.id);
      setComments((list) => list ? [...list, created] : [created]);
      setBody('');
      setReplyTo(null);
    } catch {
      // Keep the draft and selected parent so a failed request can be retried.
      setPostError('Could not post your comment. Your draft is still here; please try again.');
    } finally {
      setPosting(false);
    }
  }

  const roots = comments ? commentThread(comments) : [];

  return (
    <section aria-label="Ticket conversation" className="grid min-w-0 gap-4 border-t pt-4">
      <div>
        <h2 className="font-semibold">Conversation</h2>
        <p className="text-xs text-muted-foreground">Updates and discussion stay separate from the ticket details.</p>
      </div>

      {comments === null ? (
        loadFailed ? (
          <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
            <span>Couldn&apos;t load the conversation.</span>
            <Button type="button" size="sm" variant="outline" onClick={() => setRetry((n) => n + 1)}>Try again</Button>
          </div>
        ) : <p role="status" className="text-sm text-muted-foreground">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No comments yet. Add the first update.</p>
      ) : (
        <div className="grid min-w-0 gap-3">
          {roots.map((node) => <Comment key={node.comment.id} node={node} depth={0} onReply={setReplyTo} />)}
        </div>
      )}

      {replyTo && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
          <span>Replying to <strong>{personLabel(replyTo.author)}</strong></span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setReplyTo(null)}>Cancel reply</Button>
        </div>
      )}
      <form onSubmit={post} className="grid min-w-0 gap-2">
        <label htmlFor={`comment-${ticketId}`} className="text-sm font-medium">{replyTo ? 'Your reply' : 'Add a comment'}</label>
        <textarea
          id={`comment-${ticketId}`}
          value={body}
          maxLength={maxLength}
          rows={3}
          placeholder={replyTo ? 'Write a reply…' : 'Share an update or ask a question…'}
          onChange={(event) => setBody(event.target.value)}
          className="min-w-0 w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {postError && <p role="alert" className="text-sm text-destructive">{postError}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{body.length}/{maxLength}</span>
          <Button type="submit" size="sm" disabled={posting || comments === null || !body.trim()}>{posting ? 'Posting…' : replyTo ? 'Post reply' : 'Post comment'}</Button>
        </div>
      </form>
    </section>
  );
}

function Comment({ node, depth, onReply }: { node: CommentNode; depth: number; onReply: (comment: TicketComment) => void }) {
  const comment = node.comment;
  const date = new Date(comment.created_at);
  const timestamp = Number.isNaN(date.getTime()) ? comment.created_at : commentDate.format(date);
  return (
    <article className={`min-w-0 rounded-lg border p-3 ${depth > 0 ? 'ml-3 border-l-2 bg-muted/20 sm:ml-6' : ''}`}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-sm font-medium">{personLabel(comment.author)}</span>
        <time dateTime={comment.created_at} className="text-xs text-muted-foreground">{timestamp} UTC</time>
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm">{comment.body}</p>
      <Button type="button" variant="ghost" size="sm" className="mt-1 -ml-2" onClick={() => onReply(comment)}>Reply</Button>
      {node.replies.length > 0 && (
        <div className="mt-2 grid gap-2 border-l pl-3 sm:pl-4">
          {node.replies.map((reply) => <Comment key={reply.comment.id} node={reply} depth={depth + 1} onReply={onReply} />)}
        </div>
      )}
    </article>
  );
}
