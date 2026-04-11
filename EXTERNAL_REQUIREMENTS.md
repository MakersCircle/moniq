# External Integration Requirements

This file tracks everything that was intentionally deferred from the MVP build.
When you are ready to implement any of these, follow the steps below.

---

## 1. Google OAuth (Sign-In)

**Status:** Deferred — MVP uses localStorage only.

**When ready:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project named `moniq`.
3. Enable **Google Sheets API** and **Google Drive API**.
4. Under **APIs & Services → Credentials**, create an **OAuth 2.0 Client ID** (Web Application).
5. Set Authorized JS Origins to your deployment URL (e.g., `https://moniq.app`).
6. Copy the **Client ID** into `.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```
7. Install: `npm install @react-oauth/google`
8. Wrap `App` with `<GoogleOAuthProvider clientId={...}>`.
9. Add a Login page with `<GoogleLogin onSuccess={...} />`.
10. Store the returned `access_token` in Zustand `authStore`.

---

## 2. Google Sheets API (Database)

**Status:** Deferred — MVP uses Zustand `persist` with localStorage.

**When ready:**
1. Complete Google OAuth (above) first.
2. Upgrade OAuth scope to include:
   ```
   https://www.googleapis.com/auth/drive.file
   ```
3. On first login, call `POST https://sheets.googleapis.com/v4/spreadsheets` to create:
   - Sheet: `Sources`
   - Sheet: `Methods`
   - Sheet: `Categories`
   - Sheet: `Transactions`
4. Save the returned `spreadsheetId` to localStorage.
5. Replace all Zustand `persist` reads/writes with `spreadsheets.values.get` / `values.append` / `values.update` calls.
6. See `src/api/` directory (to be created) for stubs.

**API Reference:** https://developers.google.com/sheets/api/reference/rest

---

## 3. PWA / Offline Support

**Status:** Deferred — App currently requires network for font loading.

**When ready:**
1. Install: `npm install vite-plugin-pwa`
2. Configure service worker in `vite.config.ts`.
3. Add `manifest.json` with icons, name, theme color.
4. Implement offline transaction queue using IndexedDB.

---

## 4. CSV Import

**Status:** Deferred — MVP only exports CSV.

**When ready:**
- Accept a CSV file upload.
- Parse headers and map to transaction fields.
- Detect duplicate rows using date + amount + note fingerprint.
