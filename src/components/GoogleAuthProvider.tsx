import { GoogleOAuthProvider as Provider } from '@react-oauth/google';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export function GoogleAuthProvider({ children }: { children: React.ReactNode }) {
  return <Provider clientId={clientId}>{children}</Provider>;
}
