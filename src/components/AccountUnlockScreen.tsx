import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { LockKeyhole, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleAuthProvider } from './GoogleAuthProvider';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Field, FieldLabel } from './ui/field';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { useDataStore } from '@/store/dataStore';
import { createAccessTokenSession } from '@/lib/authSession';

interface AccountUnlockScreenProps {
  error: string | null;
  onRetry: () => void;
  onTrustRequested: (trusted: boolean) => void;
}

function AccountUnlockScreen({ error, onRetry, onTrustRequested }: AccountUnlockScreenProps) {
  const accessToken = useDataStore(state => state.accessToken);
  const email = useDataStore(state => state.userProfile?.email);
  const [trustDevice, setTrustDevice] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const isVerifying = !!accessToken && !error;
  const login = useGoogleLogin({
    hint: email,
    prompt: 'select_account',
    scope:
      'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    onSuccess: response => {
      setIsConnecting(false);
      const session = createAccessTokenSession(
        response.access_token,
        response.expires_in,
        Date.now()
      );
      if (!session) return;
      onTrustRequested(trustDevice);
      useDataStore.getState().setAccessToken(session.accessToken, session.expiresAt);
    },
    onError: () => {
      setIsConnecting(false);
      toast.error('Could not verify Google. Your records are still saved on this device.');
    },
    onNonOAuthError: () => setIsConnecting(false),
  });
  return (
    <main className="min-h-[var(--app-viewport-height)] flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <LockKeyhole className="size-6 text-muted-foreground" aria-hidden="true" />
          <CardTitle>Unlock your workspace</CardTitle>
          <CardDescription>
            Verify your Google account to view this device’s records.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                Could not verify your account. Check your connection and try again.
              </AlertDescription>
            </Alert>
          )}
          <Field>
            <div className="flex items-center gap-2">
              <Checkbox
                id="trust-device-on-unlock"
                checked={trustDevice}
                disabled={isVerifying || isConnecting}
                onCheckedChange={checked => setTrustDevice(checked === true)}
              />
              <FieldLabel htmlFor="trust-device-on-unlock">Trust this device</FieldLabel>
            </div>
            <p className="text-xs text-muted-foreground">
              Only on a personal device. Anyone using this browser can open your records, including
              offline. You can turn this off in Settings.
            </p>
          </Field>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            disabled={isVerifying || isConnecting}
            onClick={() => {
              if (accessToken) {
                onTrustRequested(trustDevice);
                onRetry();
              } else {
                setIsConnecting(true);
                login();
              }
            }}
          >
            {(isVerifying || isConnecting) && (
              <RefreshCw className="motion-safe:animate-spin" data-icon="inline-start" />
            )}
            {isVerifying
              ? 'Verifying account…'
              : isConnecting
                ? 'Connecting…'
                : accessToken
                  ? 'Retry verification'
                  : 'Unlock with Google'}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}

export default function AccountUnlockScreenWithAuth(props: AccountUnlockScreenProps) {
  return (
    <GoogleAuthProvider>
      <AccountUnlockScreen {...props} />
    </GoogleAuthProvider>
  );
}
