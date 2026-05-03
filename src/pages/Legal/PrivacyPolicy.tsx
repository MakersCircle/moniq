import Grainient from '@/components/ui/Grainient';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full bg-[#09090b] text-slate-200 selection:bg-primary/30">
      <div className="absolute inset-0 z-0 opacity-40">
        <Grainient
          color1="#1e1e1e"
          color2="#3c3c3c"
          color3="#111111"
          timeSpeed={0.3}
          colorBalance={-0.15}
          warpStrength={2.0}
          warpFrequency={1.0}
          warpSpeed={0.5}
          warpAmplitude={20}
          blendAngle={45}
          blendSoftness={0.1}
          rotationAmount={360}
          noiseScale={1}
          grainAmount={0.05}
          grainScale={1.5}
          grainAnimated={false}
          contrast={1.2}
          gamma={1.0}
          saturation={0.8}
          centerX={0.0}
          centerY={0.0}
          zoom={1.5}
        />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-16 md:py-24">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <header className="mb-16">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-slate-400 font-mono text-sm uppercase tracking-widest">
            Last Updated: May 2026
          </p>
        </header>

        <div className="space-y-12 backdrop-blur-sm bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 md:p-12 shadow-2xl">
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-mono">
                01
              </span>
              Philosophy
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>
                At Moniq, privacy isn't a feature—it's the foundation. We built this application
                specifically because we don't want to hold your financial data. Our "No-Backend"
                architecture ensures that your sensitive information remains entirely within your
                control.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-mono">
                02
              </span>
              Data Collection & Storage
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>
                <strong className="text-slate-200">Local Storage:</strong> Your transaction logs,
                accounts, and categories are stored locally in your browser using IndexedDB. This
                data stays on your device.
              </p>
              <p>
                <strong className="text-slate-200">Cloud Sync:</strong> When you sign in with
                Google, Moniq requests permission to access a specific folder in your Google Drive.
                We create and maintain a spreadsheet there. All synchronization happens directly
                between your browser and Google's servers.
              </p>
              <p>
                <strong className="text-slate-200">No Central Server:</strong> Moniq does not have a
                centralized database. We do not (and cannot) see, store, or sell your financial
                records.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-mono">
                03
              </span>
              Google API Permissions
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>Moniq uses the following Google Scopes:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <code className="text-primary/80">drive.file</code>: To create and edit the Moniq
                  database spreadsheet in your Drive.
                </li>
                <li>
                  <code className="text-primary/80">spreadsheets</code>: To read and write data to
                  the specific Moniq ledger sheet.
                </li>
                <li>
                  <code className="text-primary/80">userinfo.profile</code> &{' '}
                  <code className="text-primary/80">userinfo.email</code>: To identify your session
                  and provide a personalized experience.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-mono">
                04
              </span>
              Third-Party Services
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>
                We do not share your data with any third parties except for Google, which provides
                the authentication and storage infrastructure you explicitly opt into.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-mono">
                05
              </span>
              Contact
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>
                Since we don't store your data, we don't have a typical support desk that can
                "access your account." For privacy-related inquiries, you can reach out via our
                GitHub repository.
              </p>
            </div>
          </section>
        </div>

        <footer className="mt-16 text-center text-slate-500 text-xs font-mono uppercase tracking-widest">
          &copy; {new Date().getFullYear()} Moniq. Built for Privacy.
        </footer>
      </div>
    </div>
  );
}
