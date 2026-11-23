import { useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useGoogleLogin } from '@react-oauth/google';
import { useDataStore } from '@/store/dataStore';
import { createAccessTokenSession } from '@/lib/authSession';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { GoogleAuthProvider } from '@/components/GoogleAuthProvider';

interface SyncPausedBannerProps {
  onRetry?: () => void;
}

function SessionExpiredBanner({ onRetry }: SyncPausedBannerProps) {
  const pendingCount = useDataStore(s => s.pendingCount);
  const email = useDataStore(s => s.userProfile?.email);
  const [isConnecting, setIsConnecting] = useState(false);
  const login = useGoogleLogin({
    hint: email,
    onSuccess: response => {
      setIsConnecting(false);
      const session = createAccessTokenSession(
        response.access_token,
        response.expires_in,
        Date.now()
      );
      if (session) useDataStore.getState().setAccessToken(session.accessToken, session.expiresAt);
    },
    onError: () => {
      setIsConnecting(false);
      toast.error('Could not reconnect Google. Your changes are still saved on this device.');
    },
    onNonOAuthError: () => setIsConnecting(false),
    scope:
      'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
  });

  return (
    <Alert
      role="status"
      aria-label="Google sync paused. Saved on this device."
      variant="destructive"
      className="rounded-none border-x-0 border-t-0 shrink-0 px-4 py-2 sm:px-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <p className="min-w-0 truncate text-xs font-medium">
            <span className="sm:hidden">Sync paused</span>
            <span className="hidden sm:inline">Google sync paused. Saved on this device.</span>
            {pendingCount > 0 && (
              <>
                <span aria-hidden="true"> · </span>
                <span className="sm:hidden">{pendingCount} pending</span>
                <span className="hidden sm:inline">
                  {pendingCount} {pendingCount === 1 ? 'change' : 'changes'} waiting to sync.
                </span>
              </>
            )}
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="h-7 shrink-0 whitespace-nowrap px-3"
          aria-label={
            onRetry ? 'Retry Connection' : isConnecting ? 'Connecting…' : 'Reconnect Google'
          }
          disabled={isConnecting}
          onClick={() => {
            if (onRetry) onRetry();
            else {
              setIsConnecting(true);
              login();
            }
          }}
        >
          <RefreshCw data-icon="inline-start" />
          {isConnecting ? (
            'Connecting…'
          ) : (
            <span>
              {onRetry ? 'Retry' : 'Reconnect'}
              <span className="hidden sm:inline">{onRetry ? ' Connection' : ' Google'}</span>
            </span>
          )}
        </Button>
      </div>
    </Alert>
  );
}

export default function SessionExpiredBannerWithAuth(props: SyncPausedBannerProps) {
  return (
    <GoogleAuthProvider>
      <SessionExpiredBanner {...props} />
    </GoogleAuthProvider>
  );
}
