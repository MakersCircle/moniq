import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useDataStore } from '../store/dataStore';

export function useHomeAuth() {
  const accessToken = useDataStore(s => s.accessToken);
  const setAccessToken = useDataStore(s => s.setAccessToken);
  const navigate = useNavigate();

  const isLoggedIn = !!accessToken;

  useEffect(() => {
    // Handle redirect mode for mobile devices
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      const expiresIn = params.get('expires_in');

      if (token) {
        const expiresAt = Date.now() + (Number(expiresIn) || 3600) * 1000;
        setAccessToken(token, expiresAt);
        // Clear the hash from the URL
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/dashboard');
      }
    }
  }, [navigate, setAccessToken]);

  const login = useGoogleLogin({
    onSuccess: tokenResponse => {
      console.log('Login Success:', tokenResponse);
      const expiresAt = Date.now() + (Number(tokenResponse.expires_in) || 3600) * 1000;
      setAccessToken(tokenResponse.access_token, expiresAt);
      navigate('/dashboard');
    },
    onError: error => console.error('Login Failed:', error),
    scope:
      'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
  });

  return { isLoggedIn, login };
}
