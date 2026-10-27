// Jira import helpers (TL-542/543): what the preview needs worked out on the page.

// prefixProblem: why a typed key prefix can't be used, as the backend checks it: 2–6 capital letters
// or digits starting with a letter, and not one already used here or by another project in the import.
export function prefixProblem(prefix: string, taken: string[]): 'format' | 'taken' | null {
  if (!/^[A-Z][A-Z0-9]{1,5}$/.test(prefix)) return 'format';
  return taken.includes(prefix) ? 'taken' : null;
}

// prefixNeeded: the preview's projects whose prefix the person has to choose (its own can't be used).
export function prefixNeeded(problems: { code: string; source_id?: string }[] | undefined): Set<string> {
  return new Set((problems ?? []).filter((p) => p.code === 'bad_prefix' || p.code === 'prefix_taken').map((p) => p.source_id ?? ''));
}

export const ATLASSIAN_TOKENS = 'https://id.atlassian.com/manage-profile/security/api-tokens';
