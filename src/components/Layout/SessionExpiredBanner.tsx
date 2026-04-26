import { AlertCircle, RefreshCw } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useDataStore } from '@/store/dataStore';
import { Button } from '@/components/ui/button';

export default function SessionExpiredBanner() {
  const setAccessToken = useDataStore(s => s.setAccessToken);

  const login = useGoogleLogin({
    onSuccess: tokenResponse => {
      const expiresAt = Date.now() + (Number(tokenResponse.expires_in) || 3600) * 1000;
      setAccessToken(tokenResponse.access_token, expiresAt);
    },
    onError: error => console.error('Re-auth Failed:', error),
    scope:
      'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
  });

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-6 py-2 flex items-center justify-between animate-in fade-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <p className="text-xs font-medium">
          Session expired. Your changes won't sync to Google Sheets until you reconnect.
        </p>
      </div>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => login()}
        className="h-7 text-[10px] font-bold uppercase tracking-wider px-3"
      >
        <RefreshCw className="h-3 w-3 mr-1.5" />
        Reconnect
      </Button>
    </div>
  );
}
