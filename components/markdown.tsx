'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import type { ComponentProps } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MentionTextarea } from '@/components/mention-textarea';
import { Textarea } from '@/components/ui/textarea';

type HastNode = { type: string; tagName?: string; properties?: Record<string, unknown>; children?: HastNode[] };

// taskBox finds a task list item's checkbox (directly inside it, or inside its paragraph when loose).
function taskBox(node?: HastNode): HastNode | undefined {
  for (const c of node?.children ?? []) {
    if (c.type === 'element' && c.tagName === 'input') return c;
    if (c.type === 'element' && c.tagName === 'p') return c.children?.find((g) => g.type === 'element' && g.tagName === 'input');
  }
  return undefined;
}

// Markdown renders ticket details and comments (GitHub style: lists, tables, code, links). Raw HTML
// in the text is shown as text, never run; links open in a new tab. Task lists ("- [ ] …") render as
// checkboxes; with onToggleTask they can be clicked, reporting the task's line in the source.
export function Markdown({ children, className = '', onToggleTask }: { children: string; className?: string; onToggleTask?: (line: number) => void }) {
  const { t } = useLingui();
  return (
    <div className={`markdown break-words ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // links within the site stay in the tab; anything else opens a new one
          a: ({ node: _node, ...props }) => (props.href?.startsWith('/') && !props.href.startsWith('//')
            ? <a {...props} /> : <a {...props} target="_blank" rel="noreferrer noopener" />),
          // images only from our file storage: anyone else's would tell its owner who read this, and when
          // (anonymous request-form text included); other images show as a link instead (TL-252)
          img: ({ node: _node, src, alt }) => (typeof src === 'string' && ownImage(src)
            ? <img src={src} alt={alt ?? ''} className="max-w-full" />
            : <a href={typeof src === 'string' ? src : undefined} target="_blank" rel="noreferrer noopener">{alt || t`image`}</a>),
          // checkboxes carry no source position, so their list item draws them (below)
          input: ({ node: _node, ...props }) => (props.type === 'checkbox' ? null : <input {...props} />),
          li: ({ node, children, ...props }) => {
            const box = taskBox(node as HastNode | undefined);
            if (!box) return <li {...props}>{children}</li>;
            const line = node?.position?.start.line;
            const checked = Boolean(box.properties?.checked);
            const clickable = Boolean(onToggleTask && line);
            return (
              <li {...props}>
                <input type="checkbox" checked={checked} disabled={!clickable} readOnly={!clickable} className="mr-1.5 align-middle" data-line={line}
                  aria-label={checked ? t`Done: click to mark not done` : t`Not done: click to mark done`}
                  onChange={() => { if (clickable) onToggleTask!(line!); }} />
                {children}
              </li>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

// plainText is markdown with its symbols taken out, for one- or two-line previews (cards, rows).
export function plainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+(\[[ xX]\]\s+)?|\d+[.)]\s+)/gm, '')
    .replace(/(\*\*|__|~~|`)/g, '')
    .replace(/(^|\W)[*_]([^*_\n]+)[*_](?=\W|$)/g, '$1$2')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

// looksLikeMarkdown: the text uses markdown (emphasis, code, headings, lists, links, quotes, tables),
// so editors show a live preview under it.
export function looksLikeMarkdown(text: string): boolean {
  return /(\*\*|__|~~|`|\[[^\]]+\]\([^)]+\))|^\s{0,3}(#{1,6}\s|>\s|[-*+]\s|\d+[.)]\s|\|.*\|)/m.test(text);
}

// MarkdownPreview: the live preview editors show while the text uses markdown.
export function MarkdownPreview({ text }: { text: string }) {
  const { t } = useLingui();
  if (!looksLikeMarkdown(text)) return null;
  return (
    <div aria-label={t`Preview`} className="grid gap-1 rounded-lg border border-dashed p-3 text-sm font-normal">
      <span className="text-xs text-muted-foreground"><Trans>Preview</Trans></span>
      <Markdown>{text}</Markdown>
    </div>
  );
}

// MarkdownTextarea: the one input for text that renders as markdown (ticket details, comments, notes
// that become comments, public requests): our Textarea, with the live preview once markdown is used.
// mentions (a session token) turns on the @ people picker; public forms leave it off.
export function MarkdownTextarea({ value, mentions, ...props }: ComponentProps<typeof Textarea> & { value: string; mentions?: string }) {
  return (
    <>
      {mentions ? <MentionTextarea token={mentions} value={value} {...props} /> : <Textarea value={value} {...props} />}
      <MarkdownPreview text={value} />
    </>
  );
}

// ownImage: an image stored with our uploads (UploadThing), the only images shown inline.
export function ownImage(src: string): boolean {
  try {
    const { protocol, hostname } = new URL(src);
    return protocol === 'https:' && (hostname === 'utfs.io' || hostname.endsWith('.ufs.sh'));
  } catch {
    return false;
  }
}
