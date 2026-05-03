import Grainient from '@/components/ui/Grainient';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
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
            Terms of Service
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
              Acceptance of Terms
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>
                By using Moniq, you agree to these terms. Moniq is a local-first, manual-entry
                personal finance tool. If you do not agree to these terms, please do not use the
                application.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-mono">
                02
              </span>
              Description of Service
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>
                Moniq provides a platform for manual transaction logging, account management, and
                budgeting. It utilizes your personal Google Drive for data persistence. Moniq is NOT
                a financial institution, and it does not provide financial advice.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-mono">
                03
              </span>
              User Responsibilities
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>
                <strong className="text-slate-200">Data Accuracy:</strong> Since Moniq relies on
                manual entry, you are responsible for the accuracy of your financial data.
              </p>
              <p>
                <strong className="text-slate-200">Google Account:</strong> You are responsible for
                maintaining the security of your Google account. Loss of access to your Google
                account may result in the loss of your Moniq data.
              </p>
              <p>
                <strong className="text-slate-200">Backups:</strong> While Moniq syncs to Google
                Drive, we recommend occasionally exporting your data for safekeeping.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-mono">
                04
              </span>
              No Warranty & Limitation of Liability
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>
                Moniq is provided "as is" without warranty of any kind. We do not guarantee that the
                application will be error-free or uninterrupted. In no event shall Moniq be liable
                for any financial losses or data loss resulting from the use of the service.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-mono">
                05
              </span>
              Modifications
            </h2>
            <div className="text-slate-400 leading-relaxed space-y-4">
              <p>
                We may update these terms from time to time. Your continued use of Moniq after such
                changes constitutes acceptance of the new terms.
              </p>
            </div>
          </section>
        </div>

        <footer className="mt-16 text-center text-slate-500 text-xs font-mono uppercase tracking-widest">
          &copy; {new Date().getFullYear()} Moniq. Use Responsibly.
        </footer>
      </div>
    </div>
  );
}
