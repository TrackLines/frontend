import { onboarding, type OnboardingState } from '@/lib/api';
import { CHAPTERS, type Chapter } from './guide-tour';

// Publish deliberately with backend/internal/onboarding.GuideVersion, only for new features.
export const GUIDE = { id: 'getting-started', version: 1 } as const;

export function needsSetup(state: OnboardingState) {
  return state.admin && state.step !== 'complete';
}

export function offerGuide(state: OnboardingState) {
  return state.step === 'complete' && permittedChapters(state).length > 0 && state.guide.available &&
    state.guide.id === GUIDE.id && state.guide.version === GUIDE.version;
}

export function permittedChapters(state: OnboardingState): Chapter[] {
  // Fail closed against older/unknown API contracts; retain the admin guard for GitHub as well.
  return CHAPTERS.filter((chapter) => (state.chapters ?? []).includes(chapter) && (chapter !== 'github' || state.admin));
}

export const GUIDE_RESET = 'tracklines:guide-reset';
export type GuideReset = { orgId: string; userId: string; state: OnboardingState };

// Reads may finish out of order. A reset/completion invalidates earlier reads and earlier actions.
export class GuideRequests {
  private status = 0;
  private action = 0;
  read() { return { status: ++this.status, action: this.action }; }
  currentRead(read: { status: number; action: number }) { return read.status === this.status && read.action === this.action; }
  change() { ++this.status; return ++this.action; }
  currentChange(action: number) { return action === this.action; }
}

export function resetForIdentity(detail: unknown, orgId: string, userId: string): OnboardingState | null {
  if (!detail || typeof detail !== 'object') return null;
  const value = detail as Partial<GuideReset>;
  if (value.orgId !== orgId || value.userId !== userId || !value.state?.guide || !Array.isArray(value.state.chapters)) return null;
  return value.state;
}

export async function requestGuideReset(orgId: string, userId: string, token: string, notify: (reset: GuideReset) => void): Promise<OnboardingState> {
  const state = await onboarding.resetGuide(orgId, token);
  notify({ orgId, userId, state }); // only publish a reset after the database confirms it
  return state;
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
