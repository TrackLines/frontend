import { loadConfigFromEnv, setDefaultConfig } from 'bugfixes';

// Next.js calls register once when the server starts. The SDK reads the
// BUGFIXES_AGENT_KEY / BUGFIXES_AGENT_SECRET environment variables here.
export function register() {
  setDefaultConfig(loadConfigFromEnv());
}
