import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useDataStore } from '@/store/dataStore';
import { AccountForm, type AccountFormData } from '@/components/Forms/AccountForm';
import { useTranslation } from '@/hooks/useTranslation';

interface CreateAccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (accountId: string, methodId: string) => void;
}

export function CreateAccountSheet({ open, onOpenChange, onSuccess }: CreateAccountSheetProps) {
  const { addAccount } = useDataStore();
  const { t } = useTranslation();

  const handleSave = (data: AccountFormData) => {
    const { accountId, methodId } = addAccount({
      name: data.name,
      type: data.type,
      description: data.description,
      initialBalance: data.initialBalance,
      isSavings: data.isSavings,
      excludeFromNet: data.excludeFromNet,
      isActive: data.isActive,
    });

    onSuccess(accountId, methodId);

    // Close sheet, AccountForm maintains its own state and will reset next time it's mounted,
    // though typically Sheets keep components mounted.
    // However, since we usually want empty forms on new, we should probably mount/unmount the form
    // but the easiest way is to add a `key` to AccountForm based on `open` if we want it to reset.
    // Or just let the user see their previous inputs. For now, closing is enough.
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0 top-12 sm:top-0 h-[calc(100%-3rem)] sm:h-full rounded-t-2xl sm:rounded-none border-t sm:border-t-0 shadow-2xl overflow-hidden"
      >
        <SheetHeader className="px-6 py-4 border-b border-border/50 shrink-0 space-y-1">
          <SheetTitle className="text-xl font-bold tracking-tight">New Account</SheetTitle>
          <SheetDescription className="text-xs">{t('account.createDescription')}</SheetDescription>
        </SheetHeader>

        {open && (
          <AccountForm
            onSave={handleSave}
            onCancel={() => onOpenChange(false)}
            submitLabel="Create Account"
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
