import { useState } from 'react';
import { FlaskConical, X } from 'lucide-react';
import { useDataStore } from '@/store/dataStore';
import DemoExitDialog from './DemoExitDialog';

export default function DemoBanner() {
  const isDemoMode = useDataStore(s => s.isDemoMode);
  const [showDialog, setShowDialog] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!isDemoMode || dismissed) return null;

  return (
    <>
      <div className="relative z-50 flex items-center justify-between gap-3 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs font-mono">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-3.5 w-3.5 shrink-0" />
          <span className="tracking-wide">
            <span className="md:hidden">Demo Mode (Local)</span>
            <span className="hidden md:inline">
              Demo Mode — data is saved locally only. Nothing syncs to the cloud.
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowDialog(true)}
            className="whitespace-nowrap text-amber-300 hover:text-amber-100 underline underline-offset-2 transition-colors"
          >
            Sign In to Sync →
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-500/60 hover:text-amber-400 transition-colors"
            aria-label="Dismiss demo banner"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {showDialog && <DemoExitDialog onClose={() => setShowDialog(false)} />}
    </>
  );
}
