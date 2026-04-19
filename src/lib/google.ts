import { useDataStore } from '../store/dataStore';

const SHEETS_API_URL = 'https://sheets.googleapis.com/v4';
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

/**
 * Unified Google API Client & Auth Service
 */
export class GoogleService {
  private static instance: GoogleService | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  static getInstance() {
    if (!GoogleService.instance) {
      GoogleService.instance = new GoogleService();
    }
    return GoogleService.instance;
  }

  // ── Auth Logic ──────────────────────────────────────────────────

  /**
   * Attempts a silent token refresh using prompt: 'none'.
   * Requires that the user is already logged in to Google in the browser.
   */
  async silentRefresh(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) return this.refreshPromise;

    this.isRefreshing = true;
    this.refreshPromise = new Promise((resolve) => {
      const { VITE_GOOGLE_CLIENT_ID } = import.meta.env;
      
      if (!window.google?.accounts?.oauth2) {
        console.error('[GoogleService] GSI library not loaded');
        this.isRefreshing = false;
        return resolve(null);
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: VITE_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        prompt: 'none',
        callback: (response: any) => {
          this.isRefreshing = false;
          if (response.access_token) {
            const expiresAt = Date.now() + (Number(response.expires_in) || 3600) * 1000;
            useDataStore.getState().setAccessToken(response.access_token, expiresAt);
            resolve(response.access_token);
          } else {
            console.warn('[GoogleService] Silent refresh failed:', response.error);
            // If it's a "user_logged_out" or similar, we should clear the session
            if (['user_logged_out', 'immediate_failed'].includes(response.error)) {
              useDataStore.getState().setAccessToken(null);
            }
            resolve(null);
          }
        },
      });

      client.requestAccessToken();
    });

    return this.refreshPromise;
  }

  // ── Unified Fetcher ─────────────────────────────────────────────

  /**
   * Centralized fetch for Google APIs.
   * Handles Authorization header, 401 detection, and automatic silent refresh retry.
   */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const store = useDataStore.getState();
    let token = store.accessToken;

    if (!token) {
      // Try a silent refresh if we think we should have a token but don't
      token = await this.silentRefresh();
      if (!token) throw new Error('Unauthenticated: No access token found');
    }

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    let response = await fetch(url, { ...options, headers });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      console.warn('[GoogleService] 401 detected, attempting silent refresh...');
      const newToken = await this.silentRefresh();
      
      if (newToken) {
        // Retry the request once with the new token
        console.log('[GoogleService] Retrying request with new token');
        const retryHeaders = {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
          'Content-Type': 'application/json',
        };
        response = await fetch(url, { ...options, headers: retryHeaders });
      } else {
        // Refresh failed, user needs to log in manually
        store.setAccessToken(null);
        throw new Error('Unauthenticated: Session expired');
      }
    }

    return response;
  }

  // ── Specific API Helpers (Consolidated) ────────────────────────

  async fetchUserProfile(): Promise<any> {
    const res = await this.fetch(USERINFO_URL);
    if (!res.ok) throw new Error('Failed to fetch user profile');
    return res.json();
  }

  async driveRequest(path: string, options: RequestInit = {}): Promise<Response> {
    return this.fetch(`${DRIVE_API_URL}${path}`, options);
  }

  async sheetsRequest(path: string, options: RequestInit = {}): Promise<Response> {
    return this.fetch(`${SHEETS_API_URL}${path}`, options);
  }
}

export const googleService = GoogleService.getInstance();
