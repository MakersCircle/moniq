import { googleService } from '../lib/google';
import type { UserProfile } from '../store/types';
import { useDataStore } from '../store/dataStore';

/** Fetches the Google User Profile (Name, Email, Picture) */
export async function fetchUserProfile(): Promise<UserProfile> {
  const data = await googleService.fetchUserProfile();
  return {
    name: data.name,
    email: data.email,
    picture: data.picture,
  };
}

const DB_NAME = 'Moniq Database';
const FOLDER_NAME = 'moniq';

/**
 * Resolves the "moniq" root folder ID using a three-tier strategy:
 *
 * 1. Persisted ID in IndexedDB (fast path — same device, any session)
 * 2. Drive files.list search (cross-device — drive.file scope returns files
 *    this app previously created for the same user + OAuth client ID)
 * 3. Create a new folder (true first-run only)
 */
async function getOrCreateFolder(): Promise<string> {
  const { folderId: storedId, setFolderId } = useDataStore.getState();

  // ── Tier 1: Persisted ID ──────────────────────────────────────────
  if (storedId) {
    const res = await googleService.driveRequest(`/files/${storedId}?fields=id,trashed`);
    if (res.ok) {
      const data = await res.json();
      if (!data.trashed) {
        return storedId;
      }
    }
    // Stale ID — clear and fall through
    setFolderId(null);
  }

  // ── Tier 2: Drive search (works cross-device under drive.file scope) ──
  // drive.file allows files.list to return files that THIS app created for
  // THIS user across all sessions — not just the current one.
  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const searchRes = await googleService.driveRequest(`/files?q=${q}&fields=files(id)&pageSize=1`);
  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files?.length > 0) {
      const foundId: string = searchData.files[0].id;
      setFolderId(foundId);
      console.log('[initializeDatabase] Found existing folder via search:', foundId);
      return foundId;
    }
  }

  // ── Tier 3: Create (true first-run) ──────────────────────────────
  console.log('[initializeDatabase] Creating new moniq folder...');
  const createRes = await googleService.driveRequest('/files', {
    method: 'POST',
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  if (!createRes.ok) throw new Error('Failed to create Moniq root folder');

  const newId: string = (await createRes.json()).id;
  setFolderId(newId);
  return newId;
}

/**
 * Resolves the "Moniq Database" spreadsheet ID using the same three-tier strategy:
 *
 * 1. Persisted ID in IndexedDB
 * 2. Drive files.list search within the resolved folder
 * 3. Create via drive.files.create (compatible with drive.file scope)
 *
 * @returns The spreadsheet ID, guaranteed to be alive and inside the moniq folder.
 */
export async function initializeDatabase(): Promise<string> {
  const { spreadsheetId: storedId, setSpreadsheetId } = useDataStore.getState();

  // ── Tier 1: Persisted ID ──────────────────────────────────────────
  if (storedId) {
    const res = await googleService.driveRequest(`/files/${storedId}?fields=id,trashed`);
    if (res.ok) {
      const data = await res.json();
      if (!data.trashed) {
        console.log('[initializeDatabase] Reusing persisted spreadsheet:', storedId);
        return storedId;
      }
    }
    setSpreadsheetId(null);
  }

  // Resolve (or create) the parent folder first
  const folderId = await getOrCreateFolder();

  // ── Tier 2: Drive search within the folder ────────────────────────
  const q = encodeURIComponent(
    `name='${DB_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and '${folderId}' in parents and trashed=false`
  );
  const searchRes = await googleService.driveRequest(`/files?q=${q}&fields=files(id)&pageSize=1`);
  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files?.length > 0) {
      const foundId: string = searchData.files[0].id;
      setSpreadsheetId(foundId);
      console.log('[initializeDatabase] Found existing spreadsheet via search:', foundId);
      return foundId;
    }
  }

  // ── Tier 3: Create (true first-run) ──────────────────────────────
  // Use drive.files.create (Drive API) with mimeType=spreadsheet — this is
  // fully compatible with drive.file scope, unlike sheetsRequest('/spreadsheets').
  console.log('[initializeDatabase] Creating new spreadsheet in folder:', folderId);
  const createRes = await googleService.driveRequest('/files', {
    method: 'POST',
    body: JSON.stringify({
      name: DB_NAME,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: [folderId],
    }),
  });
  if (!createRes.ok) throw new Error('Failed to create Moniq Database spreadsheet');

  const newId: string = (await createRes.json()).id;
  setSpreadsheetId(newId);
  console.log('[initializeDatabase] New spreadsheet created:', newId);
  return newId;
}
