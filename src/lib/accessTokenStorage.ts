import type { AccessTokenSession } from './authSession';

export const ACCESS_TOKEN_SESSION_KEY = 'moniq.oauth-session';
let volatileSession: AccessTokenSession | null = null;

/** Keep Google credentials within this browsing session, never in IndexedDB. */
export function saveAccessTokenSession(session: AccessTokenSession | null): void {
  volatileSession = session;
  try {
    if (session) sessionStorage.setItem(ACCESS_TOKEN_SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(ACCESS_TOKEN_SESSION_KEY);
  } catch {
    // When session storage is unavailable, retain access only in this document.
  }
}

export function readAccessTokenSession(now = Date.now()): AccessTokenSession | null {
  let candidate: unknown;
  try {
    const stored = sessionStorage.getItem(ACCESS_TOKEN_SESSION_KEY);
    candidate = stored ? JSON.parse(stored) : null;
  } catch {
    candidate = volatileSession;
  }
  if (
    candidate &&
    typeof candidate === 'object' &&
    'accessToken' in candidate &&
    'expiresAt' in candidate &&
    typeof candidate.accessToken === 'string' &&
    candidate.accessToken.length > 0 &&
    typeof candidate.expiresAt === 'number' &&
    Number.isFinite(candidate.expiresAt) &&
    candidate.expiresAt > now
  ) {
    return { accessToken: candidate.accessToken, expiresAt: candidate.expiresAt };
  }
  saveAccessTokenSession(null);
  return null;
}
