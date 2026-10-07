export const MAX_TICKET_LABELS = 20;
export const MAX_TICKET_LABEL_LENGTH = 50;

export function normalizeLabels(labels: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of labels) {
    const label = raw.trim();
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }
  return result;
}

export function addLabels(current: string[], raw: string): { labels: string[]; error?: string } {
  const next = normalizeLabels(current);
  for (const candidate of raw.split(',')) {
    const label = candidate.trim();
    if (!label) continue;
    if (Array.from(label).length > MAX_TICKET_LABEL_LENGTH) {
      return { labels: current, error: `Labels can be at most ${MAX_TICKET_LABEL_LENGTH} characters.` };
    }
    if (next.some((existing) => existing.toLowerCase() === label.toLowerCase())) continue;
    if (next.length === MAX_TICKET_LABELS) {
      return { labels: current, error: `A ticket can have at most ${MAX_TICKET_LABELS} labels.` };
    }
    next.push(label);
  }
  return { labels: next };
}

export function removeLabel(current: string[], label: string): string[] {
  return current.filter((existing) => existing.toLowerCase() !== label.toLowerCase());
}
