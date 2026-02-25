import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateProductCategory,
  useUpdateProductCategory,
  type ProductCategory,
  type ProductCategoryInsert,
} from "@/hooks/useProductCategories";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: ProductCategory | null;
}

export function ProductCategoryDialog({ open, onOpenChange, category }: Props) {
  const createCategory = useCreateProductCategory();
  const updateCategory = useUpdateProductCategory();

  const [form, setForm] = useState<ProductCategoryInsert>({
    name: "",
    slug: "",
    icon: "package",
    color: "#6B7280",
    sort_order: 0,
  });

  useEffect(() => {
    if (category) {
      setForm({
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        color: category.color,
        sort_order: category.sort_order,
      });
    } else {
      setForm({ name: "", slug: "", icon: "package", color: "#6B7280", sort_order: 0 });
    }
  }, [category, open]);

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    const slug = form.slug.trim() || generateSlug(form.name);
    try {
      if (category) {
        await updateCategory.mutateAsync({ id: category.id, ...form, slug });
        toast.success("Category updated");
      } else {
        await createCategory.mutateAsync({ ...form, slug });
        toast.success("Category created");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save category");
    }
  };

  const isPending = createCategory.isPending || updateCategory.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{category ? "Edit Category" : "Add Category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({
                  ...f,
                  name,
                  slug: !category ? generateSlug(name) : f.slug,
                }));
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="auto-generated"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Icon (lucide name)</Label>
              <Input
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                type="color"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : category ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
