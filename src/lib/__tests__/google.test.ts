import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const { state } = vi.hoisted(() => ({
  state: { accessToken: 'valid' as string | null, tokenExpiresAt: 0, expireSession: vi.fn() },
}));
vi.mock('@/store/dataStore', () => ({ useDataStore: { getState: () => state } }));
import { googleService } from '../google';

beforeEach(() => {
  state.accessToken = 'valid';
  state.tokenExpiresAt = Date.now() + 90_000;
  state.expireSession.mockClear();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
});
afterEach(() => vi.unstubAllGlobals());

describe('Google sync authorization', () => {
  it('uses a near-expiry token without trying to authorize in the background', async () => {
    await googleService.fetch('https://example.test');
    expect(fetch).toHaveBeenCalledWith(
      'https://example.test',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer valid' }),
      })
    );
    expect(state.expireSession).not.toHaveBeenCalled();
  });
  it('pauses sync before sending an expired token', async () => {
    state.tokenExpiresAt = Date.now() - 1;
    await expect(googleService.fetch('https://example.test')).rejects.toThrow('Google sync paused');
    expect(fetch).not.toHaveBeenCalled();
    expect(state.expireSession).toHaveBeenCalledOnce();
  });
  it('pauses sync on a revoked token without opening another authorization flow', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 401 }));
    await expect(googleService.fetch('https://example.test')).rejects.toThrow('Google sync paused');
    expect(fetch).toHaveBeenCalledOnce();
    expect(state.expireSession).toHaveBeenCalledOnce();
  });
  it('does not invalidate a newer session when an old request returns unauthorized', async () => {
    vi.mocked(fetch).mockImplementation(async () => {
      state.accessToken = 'reconnected';
      return new Response('{}', { status: 401 });
    });
    await expect(googleService.fetch('https://example.test')).rejects.toThrow('Google sync paused');
    expect(state.expireSession).not.toHaveBeenCalled();
  });
});
