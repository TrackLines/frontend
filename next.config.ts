import type { NextConfig } from 'next';
import { SECURITY_HEADERS } from './lib/security-headers';

const nextConfig: NextConfig = {
  output: 'standalone',
  // app/global-not-found.tsx: unmatched URLs skip the root layout (and its Clerk calls) (TL-298)
  experimental: { globalNotFound: true },
  headers: async () => [{ source: '/:path*', headers: SECURITY_HEADERS }],
};
export default nextConfig;
