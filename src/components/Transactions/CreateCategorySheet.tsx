import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useDataStore } from '@/store/dataStore';
import { CategoryForm, type CategoryFormData } from '@/components/Forms/CategoryForm';

interface CreateCategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (categoryId: string) => void;
}

export function CreateCategorySheet({ open, onOpenChange, onSuccess }: CreateCategorySheetProps) {
  const { addCategory } = useDataStore();

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
        className="w-full sm:max-w-md flex flex-col p-0 top-12 sm:top-0 h-[calc(100%-3rem)] sm:h-full rounded-t-2xl sm:rounded-none border-t sm:border-t-0 shadow-2xl overflow-hidden"
      >
        <SheetHeader className="px-6 py-4 border-b border-border/50 shrink-0">
          <SheetTitle className="text-xl font-bold tracking-tight">New Category</SheetTitle>
          <SheetDescription className="sr-only">
            Fill out the details below to create a new category.
          </SheetDescription>
        </SheetHeader>

        {open && (
          <CategoryForm
            onSave={handleSave}
            onCancel={() => onOpenChange(false)}
            submitLabel="Create Category"
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
