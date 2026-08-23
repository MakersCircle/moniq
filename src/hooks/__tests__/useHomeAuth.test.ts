import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useHomeAuth } from '../useHomeAuth';
import * as router from 'react-router-dom';
import * as googleOAuth from '@react-oauth/google';
import { useDataStore } from '../../store/dataStore';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

vi.mock('@react-oauth/google', () => ({
  useGoogleLogin: vi.fn(),
}));

const mockSetAccessToken = vi.fn();
vi.mock('../../store/dataStore', () => ({
  useDataStore: Object.assign(
    vi.fn(selector => {
      // Execute the selector with our mocked state
      return selector({ accessToken: null, setAccessToken: mockSetAccessToken });
    }),
    {
      setState: vi.fn(),
      getState: vi.fn(() => ({ accessToken: null, setAccessToken: mockSetAccessToken })),
    }
  ),
}));

describe('useHomeAuth', () => {
  const mockNavigate = vi.fn();
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.spyOn(router, 'useNavigate').mockReturnValue(mockNavigate);
    vi.spyOn(googleOAuth, 'useGoogleLogin').mockReturnValue(mockLogin);
    mockSetAccessToken.mockClear();

    // Clear URL hash
    window.location.hash = '';

    // Mock Date.now for predictable expiry tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('3a. Hash token parsing (OAuth mobile redirect)', () => {
    it('U-01: Valid token + expires_in -> sets token, navigates, clears hash', () => {
      window.location.hash = '#access_token=abc&expires_in=3600';
      const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

      renderHook(() => useHomeAuth());

      expect(mockSetAccessToken).toHaveBeenCalledWith('abc', expect.any(Number));
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      expect(replaceStateSpy).toHaveBeenCalledWith(null, '', window.location.pathname);
    });

    it('U-02: Valid token, no expires_in -> falls back to 3600', () => {
      window.location.hash = '#access_token=abc';
      renderHook(() => useHomeAuth());
      expect(mockSetAccessToken).toHaveBeenCalledWith('abc', expect.any(Number));
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('U-03: expires_in is 0 -> falls back to 3600', () => {
      window.location.hash = '#access_token=abc&expires_in=0';
      renderHook(() => useHomeAuth());
      expect(mockSetAccessToken).toHaveBeenCalledWith('abc', expect.any(Number));
    });

    it('U-04: expires_in is NaN string -> falls back to 3600', () => {
      window.location.hash = '#access_token=abc&expires_in=foo';
      renderHook(() => useHomeAuth());
      expect(mockSetAccessToken).toHaveBeenCalledWith('abc', expect.any(Number));
    });

    it('U-05: Empty access_token -> nothing happens', () => {
      window.location.hash = '#access_token=';
      renderHook(() => useHomeAuth());
      expect(mockSetAccessToken).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('U-06: Hash without access_token key -> nothing happens', () => {
      window.location.hash = '#state=xyz';
      renderHook(() => useHomeAuth());
      expect(mockSetAccessToken).not.toHaveBeenCalled();
    });

    it('U-07: No hash at all -> nothing happens', () => {
      window.location.hash = '';
      renderHook(() => useHomeAuth());
      expect(mockSetAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('3b. Login success callback', () => {
    it('U-09: Valid token response -> sets token, navigates', () => {
      let onSuccessCallback: (res: {
        access_token: string;
        expires_in?: number;
      }) => void = () => {};
      vi.spyOn(googleOAuth, 'useGoogleLogin').mockImplementation((opts: unknown) => {
        const options = opts as { onSuccess: typeof onSuccessCallback };
        onSuccessCallback = options.onSuccess;
        return mockLogin;
      });

      renderHook(() => useHomeAuth());
      onSuccessCallback({ access_token: 'tok123', expires_in: 3600 });

      expect(mockSetAccessToken).toHaveBeenCalledWith('tok123', expect.any(Number));
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('U-10: Missing expires_in -> falls back to 3600', () => {
      let onSuccessCallback: (res: {
        access_token: string;
        expires_in?: number;
      }) => void = () => {};
      vi.spyOn(googleOAuth, 'useGoogleLogin').mockImplementation((opts: unknown) => {
        const options = opts as { onSuccess: typeof onSuccessCallback };
        onSuccessCallback = options.onSuccess;
        return mockLogin;
      });

      renderHook(() => useHomeAuth());
      onSuccessCallback({ access_token: 'tok123' });

      expect(mockSetAccessToken).toHaveBeenCalledWith('tok123', expect.any(Number));
    });
  });

  describe('3c. Login failure callback', () => {
    it('U-12: onError fires -> logs error', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      let onErrorCallback: (err: unknown) => void = () => {};
      vi.spyOn(googleOAuth, 'useGoogleLogin').mockImplementation((opts: unknown) => {
        const options = opts as { onError: typeof onErrorCallback };
        onErrorCallback = options.onError;
        return mockLogin;
      });

      renderHook(() => useHomeAuth());
      onErrorCallback('some error');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Login Failed:', 'some error');
      consoleErrorSpy.mockRestore();
    });
  });

  describe('3d. Already logged in', () => {
    it('U-13: accessToken in store -> isLoggedIn is true', () => {
      vi.mocked(useDataStore).mockImplementation((selector: unknown) =>
        (selector as (state: { accessToken: string | null; setAccessToken: unknown }) => unknown)({
          accessToken: 'existing_token',
          setAccessToken: mockSetAccessToken,
        })
      );
      const { result } = renderHook(() => useHomeAuth());
      expect(result.current.isLoggedIn).toBe(true);
    });

    it('U-14: No accessToken in store -> isLoggedIn is false', () => {
      vi.mocked(useDataStore).mockImplementation((selector: unknown) =>
        (selector as (state: { accessToken: string | null; setAccessToken: unknown }) => unknown)({
          accessToken: null,
          setAccessToken: mockSetAccessToken,
        })
      );
      const { result } = renderHook(() => useHomeAuth());
      expect(result.current.isLoggedIn).toBe(false);
    });
  });
});
