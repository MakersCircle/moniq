import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDataStore } from '@/store/dataStore';
import { Globe, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { getAllCurrencies, COMMON_LOCALES } from '@/constants/currencies';
import { formatCurrency } from '@/utils/format';

export default function PreferencesStep() {
  const { settings, updateSettings, setTourStep } = useDataStore();
  const completeOnboarding = useDataStore(s => s.completeOnboarding);
  
  // Local state for the modal
  const [currency, setCurrency] = useState(settings.currency || 'USD');
  const [numberLocale, setNumberLocale] = useState(settings.numberLocale || 'en-US');
  const [dateFormat, setDateFormat] = useState(settings.dateFormat || 'MMM d, yyyy');

  const handleNext = () => {
    // Only update these three. CurrencySymbol is auto-derived in the store slice when missing
    updateSettings({ currency, numberLocale, dateFormat });
    setTourStep('nav_settings');
  };

  const currencies = useMemo(
    () => getAllCurrencies(numberLocale),
    [numberLocale]
  );

  const currentCurrency = useMemo(
    () =>
      currencies.find(c => c.code === currency) || {
        code: currency,
        name: currency,
        symbol: '$',
      },
    [currencies, currency]
  );

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-xl overflow-hidden p-0 border-none shadow-2xl [&>button]:hidden">
        <div className="bg-primary/5 p-8 border-b border-border/50 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Globe className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight mb-2">
            Regional Preferences
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground max-w-md mx-auto">
            Choose your base currency, number formats, and how you'd like dates to be displayed across the app. You can always change this later.
          </DialogDescription>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Currency</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="font-medium">{c.code}</span>
                      <span className="mx-2 text-muted-foreground/50">—</span>
                      <span className="text-xs text-muted-foreground">{c.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between pt-1">
                <p className="text-[9px] text-muted-foreground italic">
                  Selected: {currentCurrency.symbol} ({currentCurrency.name})
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Number Format</label>
              <Select value={numberLocale} onValueChange={setNumberLocale}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_LOCALES.map(l => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[9px] text-muted-foreground italic pt-1">
                Preview: {formatCurrency(1234567.89, { ...settings, currency, numberLocale })}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Date Format</label>
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {[
                  'MMM d, yyyy',
                  'dd/MM/yyyy',
                  'MM/dd/yyyy',
                  'yyyy-MM-dd'
                ].map(fmt => (
                  <SelectItem key={fmt} value={fmt}>
                    {format(new Date(), fmt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-6 bg-accent/20 border-t border-border flex items-center justify-between">
          <Button
            variant="ghost"
            className="text-muted-foreground font-bold tracking-widest uppercase text-xs"
            onClick={() => completeOnboarding([], [])}
          >
            Skip Tour
          </Button>
          <Button
            className="gap-2 px-8 font-bold tracking-widest uppercase text-xs"
            onClick={handleNext}
          >
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
