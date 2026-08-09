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
    <div className="relative flex min-h-[100dvh] w-full bg-[#111111] overflow-hidden selection:bg-primary/30">
      {/* Background */}
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

      <div
        className={[
          'absolute z-10 flex flex-col gap-6',
          'bottom-20 left-6',
          'md:bottom-16 md:left-12',
          'xl:bottom-20 xl:left-16',
          '[@media(orientation:landscape)_and_(max-height:500px)]:flex-row-reverse',
          '[@media(orientation:landscape)_and_(max-height:500px)]:items-center',
          '[@media(orientation:landscape)_and_(max-height:500px)]:justify-between',
          '[@media(orientation:landscape)_and_(max-height:500px)]:right-8',
          '[@media(orientation:landscape)_and_(max-height:500px)]:bottom-[8dvh]',
          '[@media(orientation:landscape)_and_(max-height:500px)]:gap-8',
        ].join(' ')}
      >
        <div className="flex flex-col items-start gap-3 max-w-[calc(100vw-3rem)] md:max-w-none [@media(orientation:landscape)_and_(max-height:500px)]:max-w-xs">
          <div
            onClick={() => (accessToken ? navigate('/dashboard') : login())}
            className="group flex w-max cursor-pointer items-center rounded-full border border-border/30 bg-card hover:bg-foreground hover:text-background p-3 text-foreground transition-all duration-700 ease-out"
          >
            <ArrowRight className="h-5 w-5 md:h-6 md:w-6 shrink-0 transition-transform duration-500 group-hover:-rotate-45" />
            <div
              className={[
                'grid transition-[grid-template-columns] duration-700 ease-[cubic-bezier(0.19,1,0.22,1)]',
                'grid-cols-[1fr]',
                '[@media(hover:hover)]:grid-cols-[0fr]',
                '[@media(hover:hover)]:group-hover:grid-cols-[1fr]',
              ].join(' ')}
            >
              <div className="overflow-hidden">
                <span className="whitespace-nowrap pl-3 pr-2 font-mono text-xs md:text-sm font-bold tracking-wide">
                  {accessToken ? 'Go to Dashboard' : 'Sign in with Google'}
                </span>
              </div>
            </div>
          </div>

          <p className="font-sans text-xs sm:text-sm text-foreground/80 leading-snug font-medium max-w-[min(280px,calc(100vw-3rem))] md:max-w-[320px]">
            Seamless personal finance tracking powered by your own Google Drive.
          </p>

          <p className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider leading-relaxed max-w-[min(280px,calc(100vw-3rem))] md:max-w-[320px]">
            Your data is yours. We don't even have a backend to store it. Your logs sync directly,
            securely, and privately to a hidden spreadsheet inside your own Drive. We couldn't look
            at your ledgers even if we tried.
          </p>
        </div>

        {/* Wordmark */}
        <div
          className={[
            'relative select-none text-foreground',
            'w-[55vw] sm:w-[48vw] md:w-[42vw] lg:w-[400px] xl:w-[440px]',
            '[@media(orientation:landscape)_and_(max-height:500px)]:w-auto',
            '[@media(orientation:landscape)_and_(max-height:500px)]:h-[62dvh]',
          ].join(' ')}
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

      {/* Footer */}
      <div
        className={[
          'absolute z-10 flex flex-wrap items-center gap-x-4 gap-y-1',
          'bottom-6 left-6 right-6 justify-start',
          'md:left-auto md:bottom-10 md:right-12 md:justify-end md:gap-x-6',
          'xl:bottom-12 xl:right-16',
          '[@media(orientation:landscape)_and_(max-height:500px)]:left-auto',
          '[@media(orientation:landscape)_and_(max-height:500px)]:right-8',
          '[@media(orientation:landscape)_and_(max-height:500px)]:bottom-[1.5dvh]',
          '[@media(orientation:landscape)_and_(max-height:500px)]:justify-end',
          '[@media(orientation:landscape)_and_(max-height:500px)]:gap-3',
        ].join(' ')}
      >
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
