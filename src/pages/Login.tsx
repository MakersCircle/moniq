import { useGoogleLogin } from '@react-oauth/google';
import { LogIn } from 'lucide-react';
import { useDataStore } from '../store/dataStore';

export default function Login() {
  const setAccessToken = useDataStore((s) => s.setAccessToken);

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log('Login Success:', tokenResponse);
      setAccessToken(tokenResponse.access_token);
    },
    onError: (error) => console.error('Login Failed:', error),
    // Required scopes to create and edit the user's Moniq spreadsheet, plus profile
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
  });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100dvh', padding: 'var(--space-6)', textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.05em', marginBottom: 'var(--space-2)' }}>
        moniq
      </h1>
      <p className="text-secondary" style={{ marginBottom: 'var(--space-10)' }}>
        Your personal finance tracker.
      </p>

      <button 
        className="btn btn-primary btn-lg" 
        onClick={() => login()}
        style={{ width: '100%', maxWidth: '300px' }}
      >
        <LogIn size={20} />
        Sign in with Google
      </button>

      <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: 'var(--space-6)', maxWidth: '300px' }}>
        We request permission to create and manage a single Google Sheet in your Drive, which acts as your private database.
      </p>
    </div>
  );
}
