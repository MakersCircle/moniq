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
        { properties: { title: 'Sources' } },
        { properties: { title: 'Categories' } },
        { properties: { title: 'Methods' } },
        { properties: { title: 'Settings' } },
      ],
    }),
  });

  if (!createRes.ok) throw new Error('Failed to create new spreadsheet');
  const createData = await createRes.json();
  const sheetId = createData.spreadsheetId;

  // 4. Move the newly created spreadsheet into the target folder
  // Get current parents to remove them (typically 'root' folder)
  const fileRes = await fetch(`${DRIVE_API_URL}/files/${sheetId}?fields=parents`, { headers });
  const fileData = await fileRes.json();
  const previousParents = fileData.parents ? fileData.parents.join(',') : '';

  await fetch(`${DRIVE_API_URL}/files/${sheetId}?addParents=${folderId}&removeParents=${previousParents}`, {
    method: 'PATCH',
    headers,
  });

  return sheetId;
}

/** Synchronizes the local Zustand data state to the Google Sheets Database */
export async function syncDataToGoogleSheets(
  accessToken: string, 
  spreadsheetId: string, 
  state: any
): Promise<void> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // 1. Prepare Transactions
  const txRows = state.transactions.map((t: any) => [
    t.id, t.groupId || '', t.type, t.amount, t.date, t.sourceId, t.categoryId || '', t.note || '', t.isDeleted ? 'TRUE' : 'FALSE', t.createdAt, t.updatedAt
  ]);
  txRows.unshift(['ID', 'Group ID', 'Type', 'Amount', 'Date', 'Source ID', 'Category ID', 'Note', 'Is Deleted', 'Created At', 'Updated At']);

  // 2. Prepare Sources
  const srcRows = state.sources.map((s: any) => [
    s.id, s.name, s.type, s.initialBalance, s.currency || '', s.isActive ? 'TRUE' : 'FALSE', s.createdAt || ''
  ]);
  srcRows.unshift(['ID', 'Name', 'Type', 'Initial Balance', 'Currency', 'Is Active', 'Created At']);

  // 3. Prepare Categories
  const catRows = state.categories.map((c: any) => [
    c.id, c.group, c.head, c.subHead || '', c.isActive ? 'TRUE' : 'FALSE', c.createdAt || ''
  ]);
  catRows.unshift(['ID', 'Group', 'Head', 'Sub Head', 'Is Active', 'Created At']);

  // 4. Prepare Methods
  const metRows = state.methods.map((m: any) => [
    m.id, m.name, m.linkedSourceId || '', m.isActive ? 'TRUE' : 'FALSE', m.createdAt || ''
  ]);
  metRows.unshift(['ID', 'Name', 'Linked Source ID', 'Is Active', 'Created At']);

  // 5. Prepare Settings
  const setRows = Object.entries(state.settings || {}).map(([k, v]) => [k, String(v)]);
  setRows.unshift(['Key', 'Value']);

  // 6. First, clear the entire sheets to avoid lingering deleted row data
  const clearBody = {
    ranges: ['Transactions', 'Sources', 'Categories', 'Methods', 'Settings']
  };
  await fetch(`${SHEETS_API_URL}/spreadsheets/${spreadsheetId}/values:batchClear`, {
    method: 'POST',
    headers,
    body: JSON.stringify(clearBody)
  });

  // 7. Write all current local data back to the sheets
  const updateBody = {
    valueInputOption: "USER_ENTERED",
    data: [
      { range: 'Transactions!A1', values: txRows },
      { range: 'Sources!A1', values: srcRows },
      { range: 'Categories!A1', values: catRows },
      { range: 'Methods!A1', values: metRows },
      { range: 'Settings!A1', values: setRows },
    ]
  };

  const res = await fetch(`${SHEETS_API_URL}/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(updateBody)
  });

  if (!res.ok) {
    const errorData = await res.text();
    console.error("Sheets sync failed:", errorData);
    throw new Error('Failed to update spreadsheet rows');
  }
}

