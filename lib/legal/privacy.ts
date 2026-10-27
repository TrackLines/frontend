import { current } from '@/lib/legal/legal-history';

// The live privacy policy: the newest published version (TL-424). The text lives in
// lib/legal-versions; to change it, publish a new version there (see lib/legal/legal-history.ts).
export const PRIVACY = current('privacy').body;
