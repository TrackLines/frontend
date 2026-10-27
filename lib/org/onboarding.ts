import type { OnboardingState } from '@/lib/api';

// Publish deliberately with backend/internal/onboarding.GuideVersion, only for new features.
export const GUIDE = { id: 'getting-started', version: 1 } as const;

export function needsSetup(state: OnboardingState) {
  return state.admin && state.step !== 'complete';
}

export function offerGuide(state: OnboardingState) {
  return state.admin && state.step === 'complete' && state.guide.available &&
    state.guide.id === GUIDE.id && state.guide.version === GUIDE.version;
}

// A status request started before completion must not resurrect the same guide when it arrives late.
export function mergeGuideStatus(current: OnboardingState | null, next: OnboardingState): OnboardingState {
  if (current && !current.guide.available && current.guide.id === next.guide.id && current.guide.version === next.guide.version) {
    return { ...next, guide: { ...next.guide, available: false } };
  }
  return next;
}

// Skip, dismiss and errors do not count as completing a guide.
export function finishedGuide(event: { type: string; status: string }) {
  return event.type === 'tour:end' && event.status === 'finished';
}

export function boardDestination(state: OnboardingState) {
  return state.board_id ? `/boards/${encodeURIComponent(state.board_id)}` : '/dashboard';
}
