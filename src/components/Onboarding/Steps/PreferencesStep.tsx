import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
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
  const [formatOpen, setFormatOpen] = useState(false);
  const [formatSearch, setFormatSearch] = useState('');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

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
              <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal h-10 border-border/50 overflow-hidden">
                    <span className="truncate">
                      {getAllCurrencies().find(c => c.code === currency)?.name 
                        ? `${currency} — ${getAllCurrencies().find(c => c.code === currency)?.name}`
                        : "Select currency"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Search currency..."
                      value={currencySearch}
                      onChange={(e) => setCurrencySearch(e.target.value)}
                      className="h-8 w-full shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <div className="max-h-[250px] overflow-y-auto p-1">
                    {getAllCurrencies()
                      .filter(c => 
                        c.name.toLowerCase().includes(currencySearch.toLowerCase()) || 
                        c.code.toLowerCase().includes(currencySearch.toLowerCase())
                      )
                      .map(c => (
                      <div
                        key={c.code}
                        className={cn(
                          "px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm truncate",
                          currency === c.code && "bg-accent font-medium text-accent-foreground"
                        )}
                        title={`${c.code} — ${c.name}`}
                        onClick={() => {
                          setCurrency(c.code);
                          setCurrencyOpen(false);
                        }}
                      >
                        <span className="font-medium">{c.code}</span>
                        <span className="mx-2 text-muted-foreground/50">—</span>
                        <span className="text-xs text-muted-foreground">{c.name}</span>
                      </div>
                    ))}
                    {getAllCurrencies().filter(c => c.name.toLowerCase().includes(currencySearch.toLowerCase()) || c.code.toLowerCase().includes(currencySearch.toLowerCase())).length === 0 && (
                      <div className="p-4 text-center text-sm text-muted-foreground">No currencies found.</div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <div className="flex items-center justify-between pt-1">
                <p className="text-[9px] text-muted-foreground italic">
                  Selected: {currentCurrency.symbol} ({currentCurrency.name})
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Number Format</label>
              <Popover open={formatOpen} onOpenChange={setFormatOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal h-10 border-border/50 overflow-hidden">
                    <span className="truncate">
                      {COMMON_LOCALES.find(l => l.code === numberLocale)?.name || "Select format"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Search format..."
                      value={formatSearch}
                      onChange={(e) => setFormatSearch(e.target.value)}
                      className="h-8 w-full shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <div className="max-h-[250px] overflow-y-auto p-1">
                    {COMMON_LOCALES.filter(l => l.name.toLowerCase().includes(formatSearch.toLowerCase())).map(l => (
                      <div
                        key={l.code}
                        className={cn(
                          "px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm truncate",
                          numberLocale === l.code && "bg-accent font-medium text-accent-foreground"
                        )}
                        title={l.name}
                        onClick={() => {
                          setNumberLocale(l.code);
                          setFormatOpen(false);
                        }}
                      >
                        {l.name}
                      </div>
                    ))}
                    {COMMON_LOCALES.filter(l => l.name.toLowerCase().includes(formatSearch.toLowerCase())).length === 0 && (
                      <div className="p-4 text-center text-sm text-muted-foreground">No formats found.</div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
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
