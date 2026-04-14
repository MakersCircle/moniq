import { useGoogleLogin } from '@react-oauth/google';
import { ArrowRight } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { DotPattern } from '@/components/ui/dot-pattern';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function Login() {
  const setAccessToken = useDataStore((s) => s.setAccessToken);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log('Login Success:', tokenResponse);
      setAccessToken(tokenResponse.access_token);
    },
    onError: (error) => console.error('Login Failed:', error),
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
  });

  return (
    <div className="relative flex min-h-screen w-full bg-background overflow-hidden selection:bg-primary/30">
      
      {/* Designer Poster Noise Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.1] mix-blend-overlay">
        <svg className="absolute inset-0 h-full w-full">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>

      {/* Subtle Background Texture in Negative Space */}
      <DotPattern
        className={cn(
          "pointer-events-none absolute inset-[-50px] z-0 opacity-40 transition-transform duration-[400ms] ease-out [mask-image:radial-gradient(circle_at_top_right,white,transparent_75%)]",
        )}
        style={{
          transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -30}px)`
        }}
      />

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
                onClick={() => login()}
                className="group flex w-max cursor-pointer items-center rounded-full border border-border/30 bg-card hover:bg-foreground hover:text-background p-2 md:p-3 text-foreground transition-all duration-700 ease-out z-10"
              >
                <ArrowRight className="h-4 w-4 md:h-6 md:w-6 shrink-0 transition-transform duration-500 group-hover:-rotate-45" />
                <div className="grid grid-cols-[0fr] transition-[grid-template-columns] duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:grid-cols-[1fr]">
                  <div className="overflow-hidden">
                    <span className="whitespace-nowrap pl-2 md:pl-3 pr-1 md:pr-2 font-mono text-[10px] md:text-sm font-bold tracking-wide">
                      Sign in with Google
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
