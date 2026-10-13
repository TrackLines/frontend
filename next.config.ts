import type { NextConfig } from 'next';
import { SECURITY_HEADERS } from './lib/security-headers';

const nextConfig: NextConfig = {
  output: 'standalone',
  headers: async () => [{ source: '/:path*', headers: SECURITY_HEADERS }],
};
export default nextConfig;
