import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { CloudUpload, Trash2 } from 'lucide-react';
import { useDataStore } from '@/store/dataStore';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DemoExitDialogProps {
  onClose: () => void;
}

export default function DemoExitDialog({ onClose }: DemoExitDialogProps) {
  const exitDemoMode = useDataStore(s => s.exitDemoMode);
  const resetData = useDataStore(s => s.resetData);
  const setAccessToken = useDataStore(s => s.setAccessToken);
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const close = () => {
    setIsOpen(false);
    onClose();
  };

  const loginWithKeepData = useGoogleLogin({
    onSuccess: tokenResponse => {
      exitDemoMode(); // clear isDemoMode flag — SyncEngine will push local data on first sync
      const expiresAt = Date.now() + (Number(tokenResponse.expires_in) || 3600) * 1000;
      setAccessToken(tokenResponse.access_token, expiresAt);
      navigate('/dashboard');
      close();
    },
    onError: err => console.error('Login Failed:', err),
    scope:
      'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
  });

  const loginWithFreshStart = useGoogleLogin({
    onSuccess: tokenResponse => {
      resetData(); // wipes IndexedDB + Zustand (also clears isDemoMode)
      const expiresAt = Date.now() + (Number(tokenResponse.expires_in) || 3600) * 1000;
      setAccessToken(tokenResponse.access_token, expiresAt);
      navigate('/dashboard');
      close();
    },
    onError: err => console.error('Login Failed:', err),
    scope:
      'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => {
        if (!open) close();
      }}
    >
      <DialogContent className="max-w-md border-border/40 bg-card shadow-2xl">
        <div className="flex flex-col gap-5 p-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Sign in to Moniq</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You're currently in Demo Mode. What would you like to do with the data you've entered?
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => loginWithKeepData()}
              className="group flex items-start gap-4 rounded-lg border border-border/40 bg-background/50 p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <CloudUpload className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Keep Data &amp; Sync to Google Drive</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  All your demo entries will be uploaded to your personal Google Drive spreadsheet.
                </p>
              </div>
            </button>

            <button
              onClick={() => loginWithFreshStart()}
              className="group flex items-start gap-4 rounded-lg border border-border/40 bg-background/50 p-4 text-left transition-all hover:border-destructive/30 hover:bg-destructive/5"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="font-medium text-foreground">Discard &amp; Start Fresh</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Your demo data will be deleted. You'll start with a clean, empty ledger.
                </p>
              </div>
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={close}
            className="self-center text-muted-foreground"
          >
            Stay in Demo Mode
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
