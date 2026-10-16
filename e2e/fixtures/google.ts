import type { Page, Route } from '@playwright/test';

type GoogleMock = {
  createdFolders: string[];
  createdSpreadsheets: string[];
  authorizedRequests: string[];
  unexpectedRequests: string[];
  failedBatchGets: number;
  failNextBatchGet: () => void;
  sheetRows: (name: string) => string[][];
  appendSheetRow: (name: string, row: string[]) => void;
  holdNextBatchGet: () => { requested: Promise<void>; release: () => void };
};

const folderId = 'fake-moniq-folder';
const spreadsheetId = 'fake-moniq-sheet';

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

/** Fake the public Google API contract while keeping the app's real init/sync path. */
export async function installFakeGoogle(page: Page): Promise<GoogleMock> {
  const rows = new Map<string, string[][]>();
  let heldBatchGet: { requested: () => void; resume: Promise<void> } | null = null;
  let failNextBatchGet = false;
  const mock: GoogleMock = {
    createdFolders: [],
    createdSpreadsheets: [],
    authorizedRequests: [],
    unexpectedRequests: [],
    failedBatchGets: 0,
    failNextBatchGet: () => {
      failNextBatchGet = true;
    },
    sheetRows: name => (rows.get(name) || []).map(row => [...row]),
    appendSheetRow: (name, row) => {
      const current = rows.get(name);
      if (!current?.length) throw new Error(`Sheet ${name} has no header`);
      current.push([...row]);
    },
    holdNextBatchGet: () => {
      let requested!: () => void;
      let release!: () => void;
      const requestedPromise = new Promise<void>(resolve => {
        requested = resolve;
      });
      const resume = new Promise<void>(resolve => {
        release = resolve;
      });
      heldBatchGet = { requested, resume };
      return { requested: requestedPromise, release };
    },
  };
  const tabs = new Map<string, number>([['Sheet1', 0]]);
  let nextSheetId = 1;
  let folderExists = false;
  let spreadsheetExists = false;

  await page.route('https://accounts.google.com/gsi/client', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        window.__fakeGoogleScopes ||= [];
        window.__fakeGoogleLoginCount ||= 0;
        window.google = { accounts: {
          oauth2: { initTokenClient(config) {
            window.__fakeGoogleScopes.push(config.scope);
            return { requestAccessToken() {
              window.__fakeGoogleLoginCount++;
              config.callback({ access_token: 'fake-access-token', expires_in: 3600 });
            } };
          } },
          id: { disableAutoSelect() {} }
        } };
      `,
    })
  );

  await page.route('https://www.googleapis.com/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    if (request.headers().authorization !== 'Bearer fake-access-token') {
      mock.unexpectedRequests.push(`Unauthorized ${method} ${path}`);
      return json(route, { error: 'Missing fake access token' }, 401);
    }
    mock.authorizedRequests.push(`${method} ${path}`);

    if (method === 'GET' && path === '/oauth2/v3/userinfo') {
      return json(route, {
        name: 'Browser Tester',
        email: 'browser@example.test',
        picture: '/favicon.svg',
      });
    }

    if (path === '/drive/v3/files' && method === 'GET') {
      const query = url.searchParams.get('q') || '';
      if (query.includes("name='moniq'") || query.includes("name = 'moniq'")) {
        return json(route, { files: folderExists ? [{ id: folderId }] : [] });
      }
      if (query.includes("name='Moniq Database'")) {
        return json(route, { files: spreadsheetExists ? [{ id: spreadsheetId }] : [] });
      }
      return json(route, { files: [] });
    }

    if (path === '/drive/v3/files' && method === 'POST') {
      const body = request.postDataJSON() as { name: string; mimeType: string };
      if (body.mimeType === 'application/vnd.google-apps.folder') {
        folderExists = true;
        mock.createdFolders.push(body.name);
        return json(route, { id: body.name === 'moniq' ? folderId : 'fake-backup-folder' });
      }
      if (body.mimeType === 'application/vnd.google-apps.spreadsheet') {
        spreadsheetExists = true;
        mock.createdSpreadsheets.push(body.name);
        return json(route, { id: spreadsheetId });
      }
    }

    if (path.startsWith('/drive/v3/files/') && method === 'GET') {
      return json(route, { id: path.split('/').pop(), trashed: false });
    }
    if (path.endsWith('/copy') && method === 'POST') {
      return json(route, { id: 'fake-backup-copy' });
    }

    mock.unexpectedRequests.push(`${method} ${path}`);
    return json(route, { error: 'Unexpected fake Drive request' }, 500);
  });

  await page.route('https://sheets.googleapis.com/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    if (request.headers().authorization !== 'Bearer fake-access-token') {
      mock.unexpectedRequests.push(`Unauthorized ${method} ${path}`);
      return json(route, { error: 'Missing fake access token' }, 401);
    }
    mock.authorizedRequests.push(`${method} ${path}`);

    if (path === `/v4/spreadsheets/${spreadsheetId}` && method === 'GET') {
      return json(route, {
        sheets: [...tabs].map(([title, sheetId]) => ({ properties: { title, sheetId } })),
      });
    }

    if (path === `/v4/spreadsheets/${spreadsheetId}:batchUpdate` && method === 'POST') {
      const body = request.postDataJSON() as {
        requests: Array<{
          addSheet?: { properties: { title: string } };
          deleteSheet?: { sheetId: number };
        }>;
      };
      for (const item of body.requests) {
        if (item.addSheet) tabs.set(item.addSheet.properties.title, nextSheetId++);
        if (item.deleteSheet) {
          for (const [name, id] of tabs) {
            if (id === item.deleteSheet.sheetId) tabs.delete(name);
          }
        }
      }
      return json(route, { replies: [] });
    }

    if (path === `/v4/spreadsheets/${spreadsheetId}/values:batchGet` && method === 'GET') {
      if (failNextBatchGet) {
        failNextBatchGet = false;
        mock.failedBatchGets++;
        return json(route, { error: 'Simulated Sheets outage' }, 503);
      }
      if (heldBatchGet) {
        const hold = heldBatchGet;
        heldBatchGet = null;
        hold.requested();
        await hold.resume;
      }
      return json(route, {
        valueRanges: url.searchParams
          .getAll('ranges')
          .map(name => ({ values: rows.get(name) || [] })),
      });
    }

    const prefix = `/v4/spreadsheets/${spreadsheetId}/values/`;
    if (path.startsWith(prefix)) {
      const range = decodeURIComponent(path.slice(prefix.length));
      const name = range.split('!')[0].split(':')[0];
      if (method === 'GET') return json(route, { values: rows.get(name) || [] });
      if (method === 'PUT') {
        const values = (request.postDataJSON() as { values: string[][] }).values;
        const current = rows.get(name) || [];
        const rowNumber = Number(range.match(/!A(\d+)/)?.[1] || 1);
        for (const [index, value] of values.entries()) current[rowNumber - 1 + index] = value;
        rows.set(name, current);
        return json(route, { updatedRows: values.length });
      }
      if (method === 'POST' && range.endsWith(':append')) {
        const values = (request.postDataJSON() as { values: string[][] }).values;
        const current = rows.get(name) || [];
        const start = current.length + 1;
        current.push(...values);
        rows.set(name, current);
        return json(route, { updates: { updatedRange: `${name}!A${start}:Z${current.length}` } });
      }
      if (method === 'POST' && range.endsWith(':clear')) {
        rows.set(name, []);
        return json(route, {});
      }
    }

    if (path === `/v4/spreadsheets/${spreadsheetId}/values:batchUpdate` && method === 'POST') {
      return json(route, { totalUpdatedRows: 0 });
    }

    mock.unexpectedRequests.push(`${method} ${path}`);
    return json(route, { error: 'Unexpected fake Sheets request' }, 500);
  });

  return mock;
}
