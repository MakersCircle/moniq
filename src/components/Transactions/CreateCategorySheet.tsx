import { useDataStore } from '@/store/dataStore';
import { CategoryForm, type CategoryFormData } from '@/components/Forms/CategoryForm';
import { useTranslation } from '@/hooks/useTranslation';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { useDataStore } from '@/store/dataStore';
import { CategoryForm, type CategoryFormData } from '@/components/Forms/CategoryForm';
import { useTranslation } from '@/hooks/useTranslation';

interface CreateCategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (categoryId: string) => void;
}

export function CreateCategorySheet({ open, onOpenChange, onSuccess }: CreateCategorySheetProps) {
  const { addCategory } = useDataStore();
  const { t } = useTranslation();

  const handleSave = (data: CategoryFormData) => {
    const { id } = addCategory({
      group: data.group,
      head: data.head,
      subHead: data.subHead || undefined,
      isActive: data.isActive,
    });

    onSuccess(id);
    onOpenChange(false);
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('category.newCategory')}
      description={t('category.createDescription')}
    >
      <CategoryForm
        onSave={handleSave}
        onCancel={() => onOpenChange(false)}
        submitLabel={t('category.createCategory')}
      />
    </ResponsiveModal>
  );
}
