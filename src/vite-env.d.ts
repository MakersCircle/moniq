/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  google?: {
    accounts?: {
      oauth2: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          prompt: string;
          callback: (response: import('./lib/google').GoogleOAuthResponse) => void;
        }) => { requestAccessToken: () => void };
      };
    };
  };
  openTransactionModal: {
    openNew: () => void;
    openEdit: (data: import('./types').Transaction) => void;
    openDuplicate: (data: import('./types').Transaction) => void;
  };
}
