import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
