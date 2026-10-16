import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useDataStore } from '../store/dataStore';
import { createAccessTokenSession, parseOAuthRedirect } from '../lib/authSession';

export function useHomeAuth() {
  const accessToken = useDataStore(s => s.accessToken);
  const setAccessToken = useDataStore(s => s.setAccessToken);
  const navigate = useNavigate();

  const isLoggedIn = !!accessToken;

  useEffect(() => {
    const session = parseOAuthRedirect(window.location.hash, Date.now());
    if (!session) return;
    setAccessToken(session.accessToken, session.expiresAt);
    window.history.replaceState(null, '', window.location.pathname);
    navigate('/dashboard');
  }, [navigate, setAccessToken]);

  const login = useGoogleLogin({
    onSuccess: tokenResponse => {
      const session = createAccessTokenSession(
        tokenResponse.access_token,
        tokenResponse.expires_in,
        Date.now()
      );
      if (!session) return;
      setAccessToken(session.accessToken, session.expiresAt);
      navigate('/dashboard');
    },
    onError: error => console.error('Login Failed:', error),
    scope:
      'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
  });

  return { isLoggedIn, login };
}
