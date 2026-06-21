import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDataStore } from '@/store/dataStore';
import { CreditCard, ArrowRight } from 'lucide-react';

export default function MethodsSetupStep() {
  const methods = useDataStore(s => s.methods);
  const updateMethod = useDataStore(s => s.updateMethod);
  const setTourStep = useDataStore(s => s.setTourStep);
  const completeOnboarding = useDataStore(s => s.completeOnboarding);

  const handleNext = () => {
    setTourStep('view_methods');
  };

  const handleSkip = () => {
    completeOnboarding([], []);
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-xl overflow-hidden p-0 border-none shadow-2xl [&>button]:hidden">
        <div className="bg-primary/5 p-8 border-b border-border/50 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <CreditCard className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight mb-2">
            Payment Methods
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground max-w-md mx-auto">
            Moniq automatically created a default Payment Method for each of your accounts. You can rename them or add more later.
          </DialogDescription>
        </div>

        <div className="p-8 space-y-4">
          <div className="grid gap-3">
            {methods.filter(m => !m.isDeleted).map((method) => (
              <div key={method.id} className="flex items-center gap-4">
                <div className="w-24 text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 text-right">
                  Method
                </div>
                <Input
                  value={method.name}
                  onChange={e => updateMethod(method.id, { name: e.target.value })}
                  className="h-10"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-accent/20 border-t border-border flex items-center justify-between">
          <Button
            variant="ghost"
            className="text-muted-foreground font-bold tracking-widest uppercase text-xs"
            onClick={handleSkip}
          >
            Skip Tour
          </Button>
          <Button
            className="gap-2 px-8 font-bold tracking-widest uppercase text-xs"
            onClick={handleNext}
          >
            Looking Good <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
