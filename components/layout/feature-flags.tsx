'use client';

import { FlagsProvider } from '@flags-gg/react-library';

// flags.gg, same setup as bugfixes web: client components gate on `useFlags().is(flag).enabled()`.
// Without the three IDs the SDK skips fetching, so flagged features stay off.
const options = {
  projectId: process.env.NEXT_PUBLIC_FLAGS_PROJECT_ID,
  agentId: process.env.NEXT_PUBLIC_FLAGS_AGENT_ID,
  environmentId: process.env.NEXT_PUBLIC_FLAGS_ENV_ID,
};

export function FeatureFlags({ children }: { children: React.ReactNode }) {
  return <FlagsProvider options={options}>{children}</FlagsProvider>;
}
