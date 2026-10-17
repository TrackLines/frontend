import { current } from '@/lib/legal-history';

// The live terms of service: the newest published version (TL-424). The text lives in
// lib/legal-versions; to change it, publish a new version there (see lib/legal-history.ts).
export const TERMS = current('terms').body;
