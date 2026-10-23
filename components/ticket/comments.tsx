'use client';

import { Markdown, MarkdownTextarea } from '@/components/markdown';
import { ListSkeleton } from '@/components/page-skeletons';
import { When } from '@/components/when';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import type { Assignee, TicketComment } from '@/lib/api';
import { usePeople } from '@/lib/use-people';
import { ticketComments } from '@/lib/api';
import { personLabel } from '@/lib/people';
import { commentThread, type CommentNode } from './comment-thread';

const maxLength = 10000;

export function TicketComments({ ticketId, token }: { ticketId: string; token: string }) {
  const { t, i18n } = useLingui();
  const [comments, setComments] = useState<TicketComment[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<TicketComment | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const people = usePeople(token);

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
      setPostError(t`Could not post your comment. Your draft is still here; please try again.`);
    } finally {
      setPosting(false);
    }
  }

  return (
    <section aria-label={t`Ticket conversation`} className="grid min-w-0 gap-4 border-t pt-4">
      <div>
        <h2 className="font-semibold"><Trans>Conversation</Trans></h2>
        <p className="text-xs text-muted-foreground"><Trans>Updates and discussion stay separate from the ticket details.</Trans></p>
      </div>

      {comments === null ? (
        loadFailed ? (
          <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
            <span><Trans>Couldn&apos;t load the conversation.</Trans></span>
            <Button type="button" size="sm" variant="outline" onClick={() => setRetry((n) => n + 1)}><Trans>Try again</Trans></Button>
          </div>
        ) : <ListSkeleton rows={2} />
      ) : comments.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"><Trans>No comments yet. Add the first update.</Trans></p>
      ) : (
        <CommentList comments={comments} onReply={setReplyTo} people={people} />
      )}

      {replyTo && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
          <span><Trans>Replying to <strong>{personLabel(i18n, replyTo.author, people)}</strong></Trans></span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setReplyTo(null)}><Trans>Cancel reply</Trans></Button>
        </div>
      )}
      <form onSubmit={post} className="grid min-w-0 gap-2">
        <label htmlFor={`comment-${ticketId}`} className="text-sm font-medium">{replyTo ? <Trans>Your reply</Trans> : <Trans>Add a comment</Trans>}</label>
        <MarkdownTextarea
          id={`comment-${ticketId}`}
          value={body}
          mentions={token}
          maxLength={maxLength}
          rows={3}
          placeholder={replyTo ? t`Write a reply…` : t`Share an update or ask a question…`}
          onChange={(event) => setBody(event.target.value)}
        />
        {postError && <p role="alert" className="text-sm text-destructive">{postError}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{body.length}/{maxLength}</span>
          <Button type="submit" size="sm" disabled={posting || comments === null || !body.trim()}>{posting ? <Trans>Posting…</Trans> : replyTo ? <Trans>Post reply</Trans> : <Trans>Post comment</Trans>}</Button>
        </div>
      </form>
    </section>
  );
}

// CommentList: the threaded comments. Without onReply it's read-only (the landing page sample).
export function CommentList({ comments, onReply, people = null }: { comments: TicketComment[]; onReply?: (comment: TicketComment) => void; people?: Assignee[] | null }) {
  return (
    <div className="grid min-w-0 gap-3">
      {commentThread(comments).map((node) => <Comment key={node.comment.id} node={node} depth={0} onReply={onReply} people={people} />)}
    </div>
  );
}

function Comment({ node, depth, onReply, people }: { node: CommentNode; depth: number; onReply?: (comment: TicketComment) => void; people: Assignee[] | null }) {
  const { i18n } = useLingui();
  const comment = node.comment;
  return (
    <article className={`min-w-0 rounded-lg border p-3 ${depth > 0 ? 'ml-3 border-l-2 bg-muted/20 sm:ml-6' : ''}`}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-sm font-medium">{personLabel(i18n, comment.author, people)}</span>
        <When iso={comment.created_at} className="text-xs text-muted-foreground" />
      </div>
      <Markdown className="mt-2 text-sm">{comment.body}</Markdown>
      {onReply && <Button type="button" variant="ghost" size="sm" className="mt-1 -ml-2" onClick={() => onReply(comment)}><Trans>Reply</Trans></Button>}
      {node.replies.length > 0 && (
        <div className="mt-2 grid gap-2 border-l pl-3 sm:pl-4">
          {node.replies.map((reply) => <Comment key={reply.comment.id} node={reply} depth={depth + 1} onReply={onReply} people={people} />)}
        </div>
      )}
    </article>
  );
}
