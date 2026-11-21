import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACCESS_TOKEN_SESSION_KEY,
  readAccessTokenSession,
  saveAccessTokenSession,
} from '../accessTokenStorage';

beforeEach(() => {
  sessionStorage.clear();
  saveAccessTokenSession(null);
});
afterEach(() => vi.restoreAllMocks());

describe('session-scoped Google credentials (#97)', () => {
  it('stores a valid token in session storage and reads it within its lifetime', () => {
    saveAccessTokenSession({ accessToken: 'token', expiresAt: 2000 });
    expect(readAccessTokenSession(1000)).toEqual({ accessToken: 'token', expiresAt: 2000 });
    expect(localStorage.getItem(ACCESS_TOKEN_SESSION_KEY)).toBeNull();
  });
  it('clears expired or malformed stored credentials', () => {
    for (const value of [
      'invalid',
      '{}',
      '{"accessToken":"token","expiresAt":1000}',
      '{"accessToken":5,"expiresAt":2000}',
    ]) {
      sessionStorage.setItem(ACCESS_TOKEN_SESSION_KEY, value);
      expect(readAccessTokenSession(1000)).toBeNull();
      expect(sessionStorage.getItem(ACCESS_TOKEN_SESSION_KEY)).toBeNull();
    }
  });
  it('clears the stored token on expiry/sign-out', () => {
    saveAccessTokenSession({ accessToken: 'token', expiresAt: 2000 });
    saveAccessTokenSession(null);
    expect(readAccessTokenSession(1000)).toBeNull();
  });
  it('uses document memory if session storage is disabled', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Unavailable');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Unavailable');
    });
    saveAccessTokenSession({ accessToken: 'memory-only', expiresAt: 2000 });
    expect(readAccessTokenSession(1000)?.accessToken).toBe('memory-only');
  });
});
