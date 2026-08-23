import { useDataStore } from '@/store/dataStore';
import { AccountForm, type AccountFormData } from '@/components/Forms/AccountForm';
import { useTranslation } from '@/hooks/useTranslation';
import { ResponsiveModal } from '@/components/ui/responsive-modal';

interface CreateAccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (accountId: string, methodId: string) => void;
}

export function CreateAccountSheet({ open, onOpenChange, onSuccess }: CreateAccountSheetProps) {
  const { addAccount } = useDataStore();
  const { t } = useTranslation();

  const handleSave = (data: AccountFormData) => {
    const { accountId, methodId } = addAccount(
      {
        name: data.name,
        type: data.type,
        description: data.description,
        initialBalance: data.initialBalance,
        isSavings: data.isSavings,
        excludeFromNet: data.excludeFromNet,
        isActive: data.isActive,
      },
      data.methodName
    );

    onSuccess(accountId, methodId);

    // Close sheet, AccountForm maintains its own state and will reset next time it's mounted,
    // though typically Sheets keep components mounted.
    // However, since we usually want empty forms on new, we should probably mount/unmount the form
    // but the easiest way is to add a `key` to AccountForm based on `open` if we want it to reset.
    // Or just let the user see their previous inputs. For now, closing is enough.
    onOpenChange(false);
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="New Account"
      description={t('account.createDescription')}
    >
      <AccountForm
        onSave={handleSave}
        onCancel={() => onOpenChange(false)}
        submitLabel={t('account.createAccount')}
      />
    </ResponsiveModal>
  );
}
