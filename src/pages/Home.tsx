import { useGoogleLogin } from '@react-oauth/google';
import { ArrowRight } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import Grainient from '@/components/ui/Grainient';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const accessToken = useDataStore((s) => s.accessToken);
  const setAccessToken = useDataStore((s) => s.setAccessToken);
  const navigate = useNavigate();

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log('Login Success:', tokenResponse);
      setAccessToken(tokenResponse.access_token);
    },
    onError: (error) => console.error('Login Failed:', error),
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
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
      <div className="absolute z-10 bottom-6 left-6 md:bottom-12 md:left-12 xl:bottom-16 xl:left-16 flex flex-col">
        
        {/* Row 1: m, o, Content */}
        <div className="flex items-start font-brand text-[32vw] md:text-[24vw] lg:text-[300px] leading-[0.7] tracking-[-0.05em] text-foreground font-black select-none gap-x-4 md:gap-x-8">
          <div className="hover-primary-brand lowercase">m</div>
          <div className="hover-primary-brand lowercase">o</div>
          
          {/* Content Box */}
          <div className="relative flex flex-col justify-start pt-2 md:pt-4" style={{ fontSize: '1rem', lineHeight: 'normal', letterSpacing: 'normal', textTransform: 'none' }}>
            <div className="w-full h-full flex flex-col">
              {/* Arrow Button */}
              <div 
                onClick={() => accessToken ? navigate('/dashboard') : login()}
                className="group flex w-max cursor-pointer items-center rounded-full border border-border/30 bg-card hover:bg-foreground hover:text-background p-2 md:p-3 text-foreground transition-all duration-700 ease-out z-10"
              >
                <ArrowRight className="h-4 w-4 md:h-6 md:w-6 shrink-0 transition-transform duration-500 group-hover:-rotate-45" />
                <div className="grid grid-cols-[0fr] transition-[grid-template-columns] duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:grid-cols-[1fr]">
                  <div className="overflow-hidden">
                    <span className="whitespace-nowrap pl-2 md:pl-3 pr-1 md:pr-2 font-mono text-[10px] md:text-sm font-bold tracking-wide">
                      {accessToken ? 'Go to Dashboard' : 'Sign in with Google'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Text content */}
              <div className="mt-2 md:mt-4 flex flex-col gap-1 md:gap-2 pr-2 max-w-[140px] md:max-w-[280px]">
                <p className="font-sans text-[10px] md:text-xs lg:text-sm text-foreground/80 leading-snug md:leading-snug font-medium">
                  Seamless personal finance tracking powered by your own Google Drive.
                </p>
                <p className="font-mono text-[7px] md:text-[9px] text-muted-foreground/60 uppercase tracking-wider leading-relaxed mt-1">
                  Your data is yours. We don't even have a backend to store it. Your logs sync directly, securely, and privately to a hidden spreadsheet inside your own Drive. We couldn't look at your ledgers even if we tried.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: n, ı, q, Logo */}
        <div className="flex items-center font-brand text-[32vw] md:text-[24vw] lg:text-[300px] leading-[0.7] tracking-[-0.05em] text-foreground font-black select-none gap-x-4 md:gap-x-8">
          <div className="hover-primary-brand lowercase">n</div>
          <div className="hover-primary-brand lowercase">ı</div>
          <div className="hover-primary-brand lowercase">q</div>
          <div className="flex items-center justify-center">
            <img 
              src="/favicon.svg" 
              alt="moniq logo" 
              className="h-[0.63em] w-[0.63em] object-contain"
            />
          </div>
        </div>

      </div>
      
    </div>
  );
}

