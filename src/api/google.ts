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

  // 0. Ensure all required sheets exist
  try {
    const metaRes = await fetch(`${SHEETS_API_URL}/spreadsheets/${spreadsheetId}`, { headers });
    const metaData = await metaRes.json();
    const existingSheets = metaData.sheets.map((s: any) => s.properties.title);
    
    // Add "Accounts" if missing and "Sources" exists (MIGRATION)
    if (!existingSheets.includes('Accounts')) {
      await fetch(`${SHEETS_API_URL}/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          requests: [{ addSheet: { properties: { title: 'Accounts' } } }]
        })
      });
    }

    if (!existingSheets.includes('Budgets')) {
      await fetch(`${SHEETS_API_URL}/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          requests: [{ addSheet: { properties: { title: 'Budgets' } } }]
        })
      });
    }
  } catch (err) {
    console.warn("Failed to verify/add missing sheets:", err);
  }

  // 1. Prepare Transactions
  const txRows = state.transactions.map((t: any) => [
    t.id, 
    t.groupId || '', 
    t.uiType, 
    JSON.stringify(t.entries), // Store entries as JSON string
    t.amount, 
    t.date, 
    t.methodId || '', 
    t.note || '', 
    t.isDeleted ? 'TRUE' : 'FALSE', 
    t.createdAt, 
    t.updatedAt
  ]);
  txRows.unshift(['ID', 'Group ID', 'UI Type', 'Entries JSON', 'Amount', 'Date', 'Method ID', 'Note', 'Is Deleted', 'Created At', 'Updated At']);

  // 2. Prepare Accounts
  const accRows = state.accounts.map((s: any) => [
    s.id, s.name, s.type, s.description || '', s.isSavings ? 'TRUE' : 'FALSE', s.initialBalance, s.excludeFromNet ? 'TRUE' : 'FALSE', s.isActive ? 'TRUE' : 'FALSE', s.createdAt || ''
  ]);
  accRows.unshift(['ID', 'Name', 'Type', 'Description', 'Is Savings', 'Initial Balance', 'Exclude Net', 'Is Active', 'Created At']);

  // 3. Prepare Categories
  const catRows = state.categories.map((c: any) => [
    c.id, c.group, c.head, c.subHead || '', c.initialBalance || 0, c.isActive ? 'TRUE' : 'FALSE', c.createdAt || ''
  ]);
  catRows.unshift(['ID', 'Group', 'Head', 'Sub Head', 'Initial Balance', 'Is Active', 'Created At']);

  // 4. Prepare Methods
  const metRows = state.methods.map((m: any) => [
    m.id, m.name, m.linkedAccountId || '', m.isActive ? 'TRUE' : 'FALSE', m.createdAt || ''
  ]);
  metRows.unshift(['ID', 'Name', 'Linked Account ID', 'Is Active', 'Created At']);

  // 5. Prepare Settings
  const setRows = Object.entries(state.settings || {}).map(([k, v]) => [k, String(v)]);
  setRows.unshift(['Key', 'Value']);

  // 6. Prepare Budgets
  const budgetRows = state.budgets.map((b: any) => [
    b.id, b.categoryId, b.period, b.amount, b.createdAt
  ]);
  budgetRows.unshift(['ID', 'Category ID', 'Period', 'Amount', 'Created At']);

  // 7. Clear sheets
  const clearBody = {
    ranges: ['Transactions', 'Accounts', 'Categories', 'Methods', 'Settings', 'Budgets']
  };
  await fetch(`${SHEETS_API_URL}/spreadsheets/${spreadsheetId}/values:batchClear`, {
    method: 'POST',
    headers,
    body: JSON.stringify(clearBody)
  });

  // 8. Write back
  const updateBody = {
    valueInputOption: "USER_ENTERED",
    data: [
      { range: 'Transactions!A1', values: txRows },
      { range: 'Accounts!A1', values: accRows },
      { range: 'Categories!A1', values: catRows },
      { range: 'Methods!A1', values: metRows },
      { range: 'Settings!A1', values: setRows },
      { range: 'Budgets!A1', values: budgetRows },
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

