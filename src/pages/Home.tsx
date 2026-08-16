import { useGoogleLogin } from '@react-oauth/google';
import { ArrowRight } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import Grainient from '@/components/ui/Grainient';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { MIcon, OIcon, NIcon, IIcon } from '../components/ui/LogoParts';

export default function Home() {
  const accessToken = useDataStore(s => s.accessToken);
  const setAccessToken = useDataStore(s => s.setAccessToken);
  const startDemoMode = useDataStore(s => s.startDemoMode);
  const navigate = useNavigate();

  const handleTryDemo = async () => {
    await startDemoMode();
    navigate('/dashboard');
  };

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

  return (
    <div className="relative flex min-h-screen w-full bg-[#111111] overflow-hidden selection:bg-primary/30">
      {/* Background Grainient */}
      <div className="absolute inset-0 z-0">
        <Grainient
          color1="#1e1e1e"
          color2="#3c3c3c"
          color3="#111111"
          timeSpeed={0.6}
          colorBalance={-0.15}
          warpStrength={3.4}
          warpFrequency={1.4}
          warpSpeed={1.1}
          warpAmplitude={26}
          blendAngle={49}
          blendSoftness={0.05}
          rotationAmount={460}
          noiseScale={1}
          grainAmount={0.1}
          grainScale={2.0}
          grainAnimated={false}
          contrast={1.5}
          gamma={1.0}
          saturation={1.0}
          centerX={0.0}
          centerY={0.0}
          zoom={1.2}
        />
      </div>

      {/* Main Content — anchored bottom-left */}
      <div className="absolute z-10 bottom-16 left-6 md:bottom-10 md:left-12 xl:bottom-12 xl:left-16 flex flex-col gap-6">
        {/* CTA + copy — sits above the wordmark */}
        <div className="flex flex-col items-start gap-3">
          <div className="group flex flex-col items-start gap-1.5">
            <div
              onClick={() => (accessToken ? navigate('/dashboard') : login())}
              className="flex w-max cursor-pointer items-center rounded-full border border-border/30 bg-card hover:bg-foreground hover:text-background p-3 text-foreground transition-all duration-700 ease-out group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              <ArrowRight className="h-5 w-5 md:h-6 md:w-6 shrink-0 transition-transform duration-500 group-hover:-rotate-45" />
              <div className="grid grid-cols-[0fr] transition-[grid-template-columns] duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:grid-cols-[1fr]">
                <div className="overflow-hidden">
                  <span className="whitespace-nowrap pl-3 pr-2 font-mono text-xs md:text-sm font-bold tracking-wide">
                    {accessToken ? 'Go to Dashboard' : 'Sign in with Google'}
                  </span>
                </div>
              </div>
            </div>

            {/* Try Demo — fades in below on hover */}
            {!accessToken && (
              <button
                onClick={handleTryDemo}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100
                           font-mono text-[10px] text-muted-foreground/60 hover:text-foreground/90
                           uppercase tracking-widest ml-4 cursor-pointer"
              >
                or try demo mode →
              </button>
            )}
          </div>

          <p className="font-sans text-xs sm:text-sm text-foreground/80 leading-snug font-medium max-w-[280px] md:max-w-[320px] mt-2">
            Seamless personal finance tracking powered by your own Google Drive.
          </p>

          <p className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider leading-relaxed max-w-[280px] md:max-w-[320px]">
            Your data is yours. We don't even have a backend to store it. Your logs sync directly,
            securely, and privately to a hidden spreadsheet inside your own Drive. We couldn't look
            at your ledgers even if we tried.
          </p>
        </div>

        {/* Wordmark — vertical layout (466×346 canvas proportions) */}
        <div
          className="relative w-[62vw] sm:w-[54vw] md:w-[42vw] lg:w-[420px] xl:w-[460px] select-none text-foreground"
          style={{ aspectRatio: '466 / 346' }}
        >
          <div
            className="hover-primary-brand absolute transition-colors duration-300"
            style={{ left: '0%', top: '0.66%', width: '40.44%' }}
          >
            <MIcon className="w-full h-auto block" />
          </div>
          <div
            className="hover-primary-brand absolute transition-colors duration-300"
            style={{ left: '42.17%', top: '0%', width: '26.49%' }}
          >
            <OIcon className="w-full h-auto block" />
          </div>
          <div
            className="hover-primary-brand absolute transition-colors duration-300"
            style={{ left: '0%', top: '41.84%', width: '28.82%' }}
          >
            <NIcon className="w-full h-auto block" />
          </div>
          <div
            className="hover-primary-brand absolute transition-colors duration-300"
            style={{ left: '31.33%', top: '41.83%', width: '29.39%' }}
          >
            <IIcon className="w-full h-auto block" />
          </div>
          <img
            src="/logo-gradient.svg"
            alt="moniq logo"
            className="absolute z-0"
            style={{ left: '56.48%', top: '36.71%', width: '41.42%', height: 'auto' }}
          />
        </div>
      </div>
      {/* Footer Links */}
      <div className="absolute z-10 bottom-6 left-6 right-6 md:left-auto md:bottom-12 md:right-12 xl:bottom-16 xl:right-16 flex flex-wrap items-center justify-start md:justify-end gap-4 md:gap-6">
        <Link
          to="/docs"
          className="font-mono text-[9px] md:text-[10px] text-muted-foreground/40 hover:text-foreground transition-colors uppercase tracking-[0.2em]"
        >
          Docs
        </Link>
        <Link
          to="/privacy-policy"
          className="font-mono text-[9px] md:text-[10px] text-muted-foreground/40 hover:text-foreground transition-colors uppercase tracking-[0.2em]"
        >
          Privacy Policy
        </Link>
        <Link
          to="/terms-of-service"
          className="font-mono text-[9px] md:text-[10px] text-muted-foreground/40 hover:text-foreground transition-colors uppercase tracking-[0.2em]"
        >
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
