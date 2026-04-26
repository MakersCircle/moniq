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
    if (!this.instance) {
      this.instance = new GoogleService();
    }
    return this.instance;
  }

  // ── Auth Logic ──────────────────────────────────────────────────

  /**
   * Attempts a silent token refresh using prompt: 'none'.
   * Requires that the user is already logged in to Google in the browser.
   */
  async silentRefresh(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) return this.refreshPromise;

    this.isRefreshing = true;
    this.refreshPromise = new Promise(resolve => {
      const { VITE_GOOGLE_CLIENT_ID } = import.meta.env;

      if (!window.google?.accounts?.oauth2) {
        console.error('[GoogleService] GSI library not loaded');
        this.isRefreshing = false;
        return resolve(null);
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: VITE_GOOGLE_CLIENT_ID,
        scope:
          'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
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
    const { accessToken: token, tokenExpiresAt: expiresAt } = useDataStore.getState();

    // Refresh if token is missing OR expiring in less than 5 minutes
    const fiveMinutes = 5 * 60 * 1000;
    const isAboutToExpire = expiresAt && Date.now() > expiresAt - fiveMinutes;

    let currentToken = token;

    if (!currentToken || isAboutToExpire) {
      if (isAboutToExpire) console.log('[GoogleService] Token about to expire, refreshing...');
      currentToken = await this.silentRefresh();
      if (!currentToken) throw new Error('Unauthenticated: No access token found');
    }

    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${currentToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Handle 401 Unauthorized (fallback reactive refresh)
    if (response.status === 401) {
      console.warn('[GoogleService] 401 detected, attempting silent refresh...');
      const newToken = await this.silentRefresh();

      if (newToken) {
        // Retry the request once with the new token
        console.log('[GoogleService] Retrying request with new token');
        response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${newToken}`,
            'Content-Type': 'application/json',
          },
        });
      } else {
        // Refresh failed, user needs to log in manually
        useDataStore.getState().setAccessToken(null);
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

  // ── Drive API Helpers ──────────────────────────────────────────

  /** Find a folder by name. Returns folder ID or null. */
  async findFolder(name: string): Promise<string | null> {
    const q = encodeURIComponent(
      `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );
    const res = await this.driveRequest(`/files?q=${q}&fields=files(id)`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.files?.[0]?.id || null;
  }

  /** Create a new folder. Returns the folder ID. */
  async createFolder(name: string): Promise<string> {
    const res = await this.driveRequest('/files', {
      method: 'POST',
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    if (!res.ok) throw new Error(`Failed to create folder: ${res.statusText}`);
    const data = await res.json();
    return data.id;
  }

  /** Copy a file to a specific folder with a new name. */
  async copyFile(fileId: string, folderId: string, newName: string): Promise<string> {
    const res = await this.driveRequest(`/files/${fileId}/copy`, {
      method: 'POST',
      body: JSON.stringify({
        name: newName,
        parents: [folderId],
      }),
    });
    if (!res.ok) throw new Error(`Failed to copy file: ${res.statusText}`);
    const data = await res.json();
    return data.id;
  }

  /** List files in a folder matching a prefix. */
  async listFiles(folderId: string, prefix?: string): Promise<any[]> {
    let q = `'${folderId}' in parents and trashed = false`;
    if (prefix) {
      q += ` and name contains '${prefix}'`;
    }
    const encodedQ = encodeURIComponent(q);
    const res = await this.driveRequest(
      `/files?q=${encodedQ}&fields=files(id, name, createdTime)&orderBy=createdTime desc`
    );
    if (!res.ok) throw new Error(`Failed to list files: ${res.statusText}`);
    const data = await res.json();
    return data.files || [];
  }

  /** Delete a file by ID. */
  async deleteFile(fileId: string): Promise<void> {
    const res = await this.driveRequest(`/files/${fileId}`, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Failed to delete file: ${res.statusText}`);
    }
  }
}

export const googleService = GoogleService.getInstance();
