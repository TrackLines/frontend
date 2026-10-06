import type { TicketComment } from '@/lib/api';

export type CommentNode = { comment: TicketComment; replies: CommentNode[] };

// The API returns a flat chronological list; build a tree so replies render below their parent.
export function commentThread(comments: TicketComment[]): CommentNode[] {
  const nodes = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];
  const ordered = [...comments].sort((a, b) =>
    a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );

  for (const comment of ordered) nodes.set(comment.id, { comment, replies: [] });
  for (const comment of ordered) {
    const node = nodes.get(comment.id)!;
    const parent = comment.parent_comment_id ? nodes.get(comment.parent_comment_id) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }
  return roots;
}
