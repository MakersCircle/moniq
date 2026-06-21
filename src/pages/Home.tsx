import { useGoogleLogin } from '@react-oauth/google';
import { ArrowRight } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import Grainient from '@/components/ui/Grainient';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function Home() {
  const accessToken = useDataStore(s => s.accessToken);
  const setAccessToken = useDataStore(s => s.setAccessToken);
  const navigate = useNavigate();

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

      {/* Main Content */}
      <div className="absolute z-10 bottom-24 left-6 right-6 md:right-auto md:bottom-12 md:left-12 xl:bottom-16 xl:left-16 flex flex-col">
        {/* Row 1: m, o, Content */}
        <div className="flex flex-col md:flex-row items-start font-brand text-[15.5vw] sm:text-[14vw] md:text-[24vw] lg:text-[300px] leading-[0.7] tracking-[-0.05em] text-foreground font-black select-none gap-y-6 md:gap-y-0 md:gap-x-8">
          <div className="flex items-center md:items-start gap-x-2 md:gap-x-6">
            <div className="hover-primary-brand lowercase">m</div>
            <div className="hover-primary-brand lowercase">o</div>
            {/* Show n, ı, q and logo on mobile only in this row */}
            <div className="flex md:hidden items-center gap-x-2">
              <div className="hover-primary-brand lowercase">n</div>
              <div className="hover-primary-brand lowercase">ı</div>
              <div className="hover-primary-brand lowercase">q</div>
              <div className="flex items-center justify-center pl-1">
                <img
                  src="/favicon.svg"
                  alt="moniq logo"
                  className="h-[0.63em] w-[0.63em] object-contain"
                />
              </div>
            </div>
          </div>

          {/* Content Box */}
          <div
            className="relative flex flex-col items-start justify-start md:pt-4 gap-4 md:gap-4 order-last md:order-none"
            style={{
              fontSize: '1rem',
              lineHeight: 'normal',
              letterSpacing: 'normal',
              textTransform: 'none',
            }}
          >
            {/* Arrow Button */}
            <div
              onClick={() => (accessToken ? navigate('/dashboard') : login())}
              className="group flex w-max cursor-pointer items-center rounded-full border border-border/30 bg-card hover:bg-foreground hover:text-background p-3 md:p-3 text-foreground transition-all duration-700 ease-out z-10"
            >
              <ArrowRight className="h-5 w-5 md:h-6 md:w-6 shrink-0 transition-transform duration-500 md:group-hover:-rotate-45" />
              <div className="grid grid-cols-[1fr] md:grid-cols-[0fr] transition-[grid-template-columns] duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] md:group-hover:grid-cols-[1fr]">
                <div className="overflow-hidden">
                  <span className="whitespace-nowrap pl-3 pr-2 md:pl-3 md:pr-2 font-mono text-xs md:text-sm font-bold tracking-wide">
                    {accessToken ? 'Go to Dashboard' : 'Sign in with Google'}
                  </span>
                </div>
              </div>
            </div>

            {/* Headline */}
            <p className="font-sans text-xs md:text-xs lg:text-sm text-foreground/80 leading-snug font-medium max-w-[260px] md:max-w-[280px]">
              Seamless personal finance tracking powered by your own Google Drive.
            </p>

            {/* Paragraph */}
            <p className="font-mono text-[9px] md:text-[9px] text-muted-foreground/60 uppercase tracking-wider leading-relaxed max-w-[260px] md:max-w-[280px]">
              Your data is yours. We don't even have a backend to store it. Your logs sync directly,
              securely, and privately to a hidden spreadsheet inside your own Drive. We couldn't
              look at your ledgers even if we tried.
            </p>
          </div>
        </div>

        {/* Row 2: n, ı, q, Logo (Desktop Only) */}
        <div className="hidden md:flex items-center font-brand md:text-[24vw] lg:text-[300px] leading-[0.7] tracking-[-0.05em] text-foreground font-black select-none gap-x-4 md:gap-x-8">
          <div className="flex items-center gap-x-3 md:gap-x-6">
            <div className="hover-primary-brand lowercase">n</div>
            <div className="hover-primary-brand lowercase">ı</div>
            <div className="hover-primary-brand lowercase">q</div>
          </div>
          <div className="flex items-center justify-center">
            <img
              src="/favicon.svg"
              alt="moniq logo"
              className="h-[0.63em] w-[0.63em] object-contain"
            />
          </div>
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
