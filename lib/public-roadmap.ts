import { ApiError } from '@/lib/api';

// readRoadmap: how a shared roadmap link resolves for this visitor. 401 = it needs sign-in (show the
// lock). 403 (team-only) reads as missing too, so a private roadmap never reveals it exists.
export async function readRoadmap<T>(get: () => Promise<T>): Promise<{ roadmap: T } | 'locked' | 'missing'> {
  try {
    return { roadmap: await get() };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return 'locked';
    if (e instanceof ApiError && (e.status === 403 || e.status === 404)) return 'missing';
    throw e;
  }
}

// ownerOnly: the roadmap's project when the viewer can open it (so the page shows app navigation),
// else null; people reading a shared link see a clean page and learn nothing about the project.
export async function ownerOnly<T>(token: string | null, get: (token: string) => Promise<T>): Promise<T | null> {
  if (!token) return null;
  return get(token).catch(() => null);
}
