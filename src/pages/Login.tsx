import { useGoogleLogin } from '@react-oauth/google';
import { LogIn, Sparkles } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { DotPattern } from '@/components/ui/dot-pattern';
import { ShinyButton } from '@/components/ui/shiny-button';
import { cn } from '@/lib/utils';

export default function Login() {
  const setAccessToken = useDataStore((s) => s.setAccessToken);

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log('Login Success:', tokenResponse);
      setAccessToken(tokenResponse.access_token);
    },
    onError: (error) => console.error('Login Failed:', error),
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
  });

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background px-6 py-24 text-center">
      {/* Background decoration */}
      <DotPattern
        className={cn(
          "[mask-image:radial-gradient(400px_circle_at_center,white,transparent)]",
        )}
      />
      
      <div className="relative z-10 flex flex-col items-center max-w-md w-full">
        {/* Logo/Icon */}
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary animate-in zoom-in duration-500">
          <Sparkles className="h-8 w-8" />
        </div>

        <h1 className="text-5xl font-extrabold tracking-tighter sm:text-7xl mb-4 text-foreground">
          moniq
        </h1>
        
        <p className="text-lg text-muted-foreground mb-12 max-w-[300px]">
          Seamless personal finance tracking powered by your own Google Drive.
        </p>

        <ShinyButton 
          className="w-full h-12 text-base font-bold transition-all hover:scale-[1.02] shadow-xl" 
          onClick={() => login()}
        >
          <div className="flex items-center justify-center gap-2">
            <LogIn className="h-5 w-5" />
            Sign in with Google
          </div>
        </ShinyButton>

        <div className="mt-12 space-y-4 rounded-xl bg-muted/30 p-4 border border-border/50 backdrop-blur-sm">
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Privacy First</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Moniq uses a private Google Sheet in your Drive as its database. 
            Your data never leaves your Google account.
          </p>
        </div>
      </div>

      <div className="absolute bottom-8 text-[10px] font-medium text-muted-foreground/50 tracking-widest uppercase">
        © 2026 Moniq Finance • Open Source
      </div>
    </div>
  );
}

