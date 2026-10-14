// Security headers on every page (TL-164, TL-255).
//
// Enforced: nobody may frame us (clickjacking: tricking a signed-in user into clicking Delete, Invite
// or Make admin inside a hidden iframe), no MIME sniffing, a tight referrer, no camera, mic or location.
//
const uploads = ['https://utfs.io', 'https://*.ufs.sh', 'https://*.uploadthing.com', 'https://api.uploadthing.com'];

// Clerk's strict CSP middleware creates a per-request nonce and merges these with
// its defaults for Clerk, Stripe and Cloudflare challenge flows.
export const CSP_DIRECTIVES = {
  'connect-src': [
    'https://clerk.tracklin.es',
    'https://*.clerk.accounts.dev',
    'https://api.flags.gg',
    ...uploads,
  ],
  'img-src': ['data:', 'blob:', 'https://img.clerk.com', ...uploads],
  'frame-src': ['https://clerk.tracklin.es', 'https://*.clerk.accounts.dev', 'https://challenges.cloudflare.com'],
  'font-src': ['self', 'data:'],
  'base-uri': ['self'],
  'object-src': ['none'],
  'frame-ancestors': ['none'],
};

export const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];
