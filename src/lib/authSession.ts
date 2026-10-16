export interface AccessTokenSession {
  accessToken: string;
  expiresAt: number;
}

const DEFAULT_EXPIRY_SECONDS = 3600;

export function createAccessTokenSession(
  accessToken: string | null | undefined,
  expiresIn: string | number | null | undefined,
  now: number
): AccessTokenSession | null {
  if (!accessToken) return null;
  const parsedExpiry = Number(expiresIn);
  const expirySeconds =
    Number.isFinite(parsedExpiry) && parsedExpiry > 0 ? parsedExpiry : DEFAULT_EXPIRY_SECONDS;
  return { accessToken, expiresAt: now + expirySeconds * 1000 };
}

export function parseOAuthRedirect(hash: string, now: number): AccessTokenSession | null {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(fragment);
  return createAccessTokenSession(params.get('access_token'), params.get('expires_in'), now);
}
