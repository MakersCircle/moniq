import { describe, expect, it } from 'vitest';
import { createAccessTokenSession, parseOAuthRedirect } from '../authSession';

const now = Date.parse('2026-08-01T00:00:00Z');

describe('OAuth session decisions', () => {
  it('parses a mobile redirect token and its expiry', () => {
    expect(parseOAuthRedirect('#access_token=abc%2B123&expires_in=1800&state=xyz', now)).toEqual({
      accessToken: 'abc+123',
      expiresAt: now + 1_800_000,
    });
  });

  it.each(['', '#state=xyz', '#access_token=', '#other_access_token=abc'])(
    'ignores a redirect without a usable access token: %s',
    hash => {
      expect(parseOAuthRedirect(hash, now)).toBeNull();
    }
  );

  it('applies the one-hour fallback to absent and invalid expiry values', () => {
    for (const expiresIn of [undefined, null, '', 'invalid', '0', '-60', Infinity]) {
      expect(createAccessTokenSession('abc', expiresIn, now)).toEqual({
        accessToken: 'abc',
        expiresAt: now + 3_600_000,
      });
    }
  });

  it('uses the same expiry calculation for a login callback response', () => {
    expect(createAccessTokenSession('popup-token', 7200, now)).toEqual({
      accessToken: 'popup-token',
      expiresAt: now + 7_200_000,
    });
    expect(createAccessTokenSession('', 7200, now)).toBeNull();
  });
});
