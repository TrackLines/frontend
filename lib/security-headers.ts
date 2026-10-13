// Security headers on every page (TL-164).
//
// Enforced: nobody may frame us (clickjacking: tricking a signed-in user into clicking Delete, Invite
// or Make admin inside a hidden iframe), no MIME sniffing, a tight referrer, no camera, mic or location.
//
// Report-only: the full content policy. Clerk, UploadThing, flags.gg and Next's inline scripts all need
// entries, and a wrong one breaks sign-in, so browsers only log violations for now.
// ponytail: switch CSP_REPORT_ONLY to enforcing once production shows no violations.

const clerk = ['https://clerk.tracklin.es', 'https://*.clerk.accounts.dev', 'https://challenges.cloudflare.com'];
const uploads = ['https://utfs.io', 'https://*.ufs.sh', 'https://*.uploadthing.com', 'https://api.uploadthing.com'];

export const CSP_ENFORCED = ["frame-ancestors 'none'", "base-uri 'self'", "object-src 'none'"].join('; ');

export const CSP_REPORT_ONLY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${clerk.join(' ')}`,
  `connect-src 'self' ${clerk.join(' ')} https://api.flags.gg ${uploads.join(' ')}`,
  `img-src 'self' data: blob: https://img.clerk.com ${uploads.join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "worker-src 'self' blob:", // the Web Push service worker (/sw.js) and Clerk's
  `frame-src ${clerk.join(' ')}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

export const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP_ENFORCED },
  { key: 'Content-Security-Policy-Report-Only', value: CSP_REPORT_ONLY },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];
