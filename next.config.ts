import type { NextConfig } from 'next';
import { SECURITY_HEADERS } from './lib/security-headers';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false, // don't advertise the framework in X-Powered-By (pen-2)
  // the 1Password SDK loads a .wasm file at runtime: keep it a real package in the standalone build (TL-525)
  serverExternalPackages: ['@1password/sdk', '@1password/sdk-core'],
  // app/global-not-found.tsx: unmatched URLs skip the root layout (and its Clerk calls) (TL-298);
  // Lingui's macros (t`…`, <Trans>) compile to message lookups at build time (TL-550)
  experimental: { globalNotFound: true, swcPlugins: [['@lingui/swc-plugin', {}]] },
  headers: async () => [{ source: '/:path*', headers: SECURITY_HEADERS }],
};
export default nextConfig;
