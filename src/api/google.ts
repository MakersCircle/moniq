import type { UserProfile } from '../store/dataStore';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const SHEETS_API_URL = 'https://sheets.googleapis.com/v4';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

const DB_NAME = 'Moniq Database';
const FOLDER_NAME = 'moniq';

/** Fetches the Google User Profile (Name, Email, Picture) */
export async function fetchUserProfile(accessToken: string): Promise<UserProfile> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch user profile');
  const data = await res.json();
  return {
    name: data.name,
    email: data.email,
    picture: data.picture,
  };
}

async function getOrCreateFolder(accessToken: string, headers: any): Promise<string> {
  const query = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const searchRes = await fetch(`${DRIVE_API_URL}/files?q=${query}&fields=files(id)`, { headers });
  if (!searchRes.ok) throw new Error('Failed to query Google Drive API for folder');
  
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder
  const createRes = await fetch(`${DRIVE_API_URL}/files`, {
    method: 'POST',
    headers,
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
export async function initializeDatabase(accessToken: string): Promise<string> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // 1. Ensure the parent folder exists
  const folderId = await getOrCreateFolder(accessToken, headers);

  // 2. Search Drive for existing spreadsheet specifically inside our folder
  const query = encodeURIComponent(`name='${DB_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and '${folderId}' in parents`);
  const searchRes = await fetch(`${DRIVE_API_URL}/files?q=${query}&fields=files(id, name)`, { headers });
  
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
  const createRes = await fetch(`${SHEETS_API_URL}/spreadsheets`, {
    method: 'POST',
    headers,
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
  const fileRes = await fetch(`${DRIVE_API_URL}/files/${sheetId}?fields=parents`, { headers });
  const fileData = await fileRes.json();
  const previousParents = fileData.parents ? fileData.parents.join(',') : '';

  await fetch(`${DRIVE_API_URL}/files/${sheetId}?addParents=${folderId}&removeParents=${previousParents}`, {
    method: 'PATCH',
    headers,
  });

  return sheetId;
}
