import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0 top-auto bottom-0 h-auto max-h-[calc(100dvh-3rem)] sm:top-0 sm:bottom-0 sm:h-full sm:max-h-none rounded-t-2xl sm:rounded-none border-t sm:border-t-0 shadow-2xl overflow-hidden"
      >
        <SheetHeader className="px-6 py-4 border-b border-border/50 shrink-0">
          <SheetTitle className="text-xl font-bold tracking-tight">
            {t('category.newCategory')}
          </SheetTitle>
          <SheetDescription className="text-xs">{t('category.createDescription')}</SheetDescription>
        </SheetHeader>

        {open && (
          <div className="flex-1 overflow-hidden">
            <CategoryForm
              onSave={handleSave}
              onCancel={() => onOpenChange(false)}
              submitLabel={t('category.createCategory')}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
