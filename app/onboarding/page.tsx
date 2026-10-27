import { headers } from 'next/headers';
import { OnboardingSetup } from '@/components/onboarding/setup';

export default async function OnboardingPage() {
  return <OnboardingSetup nonce={(await headers()).get('x-nonce') ?? undefined} />;
}
