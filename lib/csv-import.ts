import type { CSVField } from './api';

// The CSV import's own logic (TL-638), kept pure for tests.

export const CSV_FIELDS: CSVField[] = ['title', 'description', 'type', 'priority', 'labels', 'status', 'due', 'created'];

// headerOf: the first record's cells: quotes honoured (a "," or "" inside them), a byte-order mark off.
// The backend parses the whole file with Go's encoding/csv; this is only to offer the column names.
export function headerOf(text: string): string[] {
  const s = text.replace(/^﻿/, '');
  const cells: string[] = [];
  let cell = '', quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { cells.push(cell.trim()); cell = ''; } else if (c === '\n' || c === '\r') break;
    else cell += c;
  }
  cells.push(cell.trim());
  return cells.filter((c, i) => c !== '' || i < cells.length - 1);
}

// The names other tools give each field, lowercase: Jira, Trello, Asana, Linear, GitHub and our own export.
const SYNONYMS: Record<CSVField, string[]> = {
  title: ['title', 'summary', 'name', 'task name', 'card name', 'issue'],
  description: ['description', 'notes', 'body', 'details', 'card description'],
  type: ['type', 'issue type', 'kind'],
  priority: ['priority'],
  labels: ['labels', 'label', 'tags'],
  status: ['column', 'status', 'state', 'list', 'section/column', 'section'],
  due: ['due', 'due date', 'deadline'],
  created: ['created', 'created at', 'created date', 'date created'],
};

// guessMapping: each field to the first header that looks like it (any case); a header is used once.
export function guessMapping(headers: string[]): Partial<Record<CSVField, string>> {
  const used = new Set<string>();
  const out: Partial<Record<CSVField, string>> = {};
  for (const field of CSV_FIELDS) {
    const h = SYNONYMS[field].map((n) => headers.find((x) => x.toLowerCase() === n && !used.has(x))).find(Boolean);
    if (h) { out[field] = h; used.add(h); }
  }
  return out;
}

// prefixFor: a key prefix from a project name ("Shop front" → SF, "Ops" → OPS), 2–6 capitals or digits
// starting with a letter, as the backend wants; "" when the name gives none.
export function prefixFor(name: string): string {
  const words = name.toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  const initials = words.map((w) => w[0]).join('');
  const p = (words.length > 1 && initials.length >= 2 ? initials : words.join('')).replace(/^[0-9]+/, '').slice(0, 6);
  return /^[A-Z][A-Z0-9]{1,5}$/.test(p) ? p : '';
}

// csvFile: the export's download name, as the server names it.
export const csvFile = (project: string) => `${project.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project'}-tickets.csv`;
