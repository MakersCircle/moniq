import { googleService } from '../lib/google';
import type { UserProfile } from '../store/dataStore';

/** Fetches the Google User Profile (Name, Email, Picture) */
export async function fetchUserProfile(_accessToken: string): Promise<UserProfile> {
  const data = await googleService.fetchUserProfile();
  return {
    name: data.name,
    email: data.email,
    picture: data.picture || data.avatar,
  };
}

const DB_NAME = 'Moniq Database';
const FOLDER_NAME = 'moniq';

async function getOrCreateFolder(): Promise<string> {
  const query = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const searchRes = await googleService.driveRequest(`/files?q=${query}&fields=files(id)`);
  if (!searchRes.ok) throw new Error('Failed to query Google Drive API for folder');

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder
  const createRes = await googleService.driveRequest('/files', {
    method: 'POST',
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  if (!createRes.ok) throw new Error('Failed to create folder');
  const createData = await createRes.json();
  return createData.id;
}

/** Finds existing Moniq Database or creates a new one inside the moniq folder. Returns Spreadsheet ID. */
export async function initializeDatabase(_accessToken: string): Promise<string> {
  // 1. Ensure the parent folder exists
  const folderId = await getOrCreateFolder();

  // 2. Search Drive for existing spreadsheet specifically inside our folder
  const query = encodeURIComponent(
    `name='${DB_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and '${folderId}' in parents`
  );
  const searchRes = await googleService.driveRequest(`/files?q=${query}&fields=files(id, name)`);

  if (!searchRes.ok) {
    throw new Error('Failed to query Google Drive API for spreadsheet');
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    console.log('Found existing database in folder:', searchData.files[0].id);
    return searchData.files[0].id;
  }

  // 3. Create new spreadsheet if not found
  console.log('Database not found in folder, creating new one...');
  const createRes = await googleService.sheetsRequest('/spreadsheets', {
    method: 'POST',
    body: JSON.stringify({
      properties: { title: DB_NAME },
      sheets: [
        { properties: { title: 'Transactions' } },
        { properties: { title: 'Accounts' } },
        { properties: { title: 'Categories' } },
        { properties: { title: 'Methods' } },
        { properties: { title: 'Settings' } },
        { properties: { title: 'Budgets' } },
      ],
    }),
  });

  if (!createRes.ok) throw new Error('Failed to create new spreadsheet');
  const createData = await createRes.json();
  const sheetId = createData.spreadsheetId;

  // 4. Move the newly created spreadsheet into the target folder
  const fileRes = await googleService.driveRequest(`/files/${sheetId}?fields=parents`);
  const fileData = await fileRes.json();
  const previousParents = fileData.parents ? fileData.parents.join(',') : '';

  await googleService.driveRequest(
    `/files/${sheetId}?addParents=${folderId}&removeParents=${previousParents}`,
    {
      method: 'PATCH',
    }
  );

  return sheetId;
}
