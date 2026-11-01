import type { NextConfig } from 'next';
import { SECURITY_HEADERS } from './lib/server/security-headers';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false, // don't advertise the framework in X-Powered-By (pen-2)
  // the 1Password SDK loads a .wasm file at runtime: keep it a real package in the standalone build (TL-525)
  // bugfixes: instrumentation.ts sets its credentials, and bundled each route would get its own copy without them,
  // so reports from routes (the browser's errors, /api/client-errors) were only ever logged locally
  serverExternalPackages: ['@1password/sdk', '@1password/sdk-core', 'bugfixes'],
  // app/global-not-found.tsx: unmatched URLs skip the root layout (and its Clerk calls) (TL-298);
  // Lingui's macros (t`…`, <Trans>) compile to message lookups at build time (TL-550)
  experimental: { globalNotFound: true, swcPlugins: [['@lingui/swc-plugin', {}]] },
  headers: async () => [
    { source: '/:path*', headers: SECURITY_HEADERS },
    // the Google Chat avatar: public/ files default to max-age=0, so Google's image proxy fetches it for every view
    { source: '/tracklines-github.png', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }] },
  ],
};
export default nextConfig;
