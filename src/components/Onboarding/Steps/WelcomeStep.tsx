import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { useDataStore } from '@/store/dataStore';

interface WelcomeStepProps {
  onSkip: () => void;
}

export default function WelcomeStep({ onSkip }: WelcomeStepProps) {
  const setTourStep = useDataStore(s => s.setTourStep);

  const handleStart = () => {
    setTourStep('preferences');
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-xl overflow-hidden p-0 border-none shadow-2xl [&>button]:hidden">
        <div className="bg-primary/5 p-12 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
            <Play className="h-10 w-10 text-primary ml-1" />
          </div>
          <DialogTitle className="text-3xl font-bold tracking-tight mb-4">
            Welcome to Moniq
          </DialogTitle>
          <DialogDescription className="text-lg text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Moniq is your personal financial ledger. Before we begin, let's take a quick guided tour to set up your accounts and preferences.
          </DialogDescription>
        </div>

        <div className="p-6 bg-accent/20 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <Button
            variant="ghost"
            className="text-muted-foreground font-bold tracking-widest uppercase text-xs"
            onClick={onSkip}
          >
            Skip Tour
          </Button>
          <Button
            className="gap-2 px-10 py-6 font-bold tracking-widest uppercase text-xs"
            onClick={handleStart}
          >
            Start Setup Tour
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
