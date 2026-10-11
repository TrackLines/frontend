import type { ComponentProps } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Textarea } from '@/components/ui/textarea';

// Markdown renders ticket details and comments (GitHub style: lists, tables, code, links). Raw HTML
// in the text is shown as text, never run; links open in a new tab.
export function Markdown({ children, className = '' }: { children: string; className?: string }) {
  return (
    <div className={`markdown break-words ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer noopener" /> }}
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
  if (!looksLikeMarkdown(text)) return null;
  return (
    <div aria-label="Preview" className="grid gap-1 rounded-lg border border-dashed p-3 text-sm font-normal">
      <span className="text-xs text-muted-foreground">Preview</span>
      <Markdown>{text}</Markdown>
    </div>
  );
}

// MarkdownTextarea: the one input for text that renders as markdown (ticket details, comments, notes
// that become comments, public requests): our Textarea, with the live preview once markdown is used.
export function MarkdownTextarea({ value, ...props }: ComponentProps<typeof Textarea> & { value: string }) {
  return (
    <>
      <Textarea value={value} {...props} />
      <MarkdownPreview text={value} />
    </>
  );
}
