import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import type { ExpenseAccount } from "@/hooks/useExpenseAccounts";

const PRESET_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#6366F1", "#EC4899", "#14B8A6", "#F97316", "#84CC16",
];

const khataSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50, "Name too long"),
  allocation_percentage: z.number().min(0, "Min 0%").max(100, "Max 100%"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color"),
  expected_monthly_expense: z.number().min(0).nullable(),
  is_active: z.boolean(),
});

type KhataFormData = z.infer<typeof khataSchema>;

interface KhataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  khata?: ExpenseAccount | null;
  onSave: (data: KhataFormData) => Promise<void>;
}

export default function KhataDialog({ open, onOpenChange, khata, onSave }: KhataDialogProps) {
  const [saving, setSaving] = useState(false);
  const isEdit = !!khata;

  const form = useForm<KhataFormData>({
    resolver: zodResolver(khataSchema),
    defaultValues: {
      name: "",
      allocation_percentage: 0,
      color: PRESET_COLORS[0],
      expected_monthly_expense: null,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: khata?.name || "",
        allocation_percentage: khata?.allocation_percentage || 0,
        color: khata?.color || PRESET_COLORS[0],
        expected_monthly_expense: khata?.expected_monthly_expense || null,
        is_active: khata?.is_active ?? true,
      });
    }
  }, [open, khata, form]);

  const handleSubmit = async (data: KhataFormData) => {
    setSaving(true);
    try {
      await onSave(data);
      onOpenChange(false);
      form.reset();
    } finally {
      setSaving(false);
    }
  };

  const selectedColor = form.watch("color");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && saving) return; onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => { if (saving) e.preventDefault(); }} onEscapeKeyDown={(e) => { if (saving) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense Source" : "Create Expense Source"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update expense account details" : "Add a new expense account for allocation"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., Marketing"
              disabled={saving}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="percentage">Allocation Percentage</Label>
            <div className="flex items-center gap-2">
              <Input
                id="percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="w-24"
                disabled={saving}
                {...form.register("allocation_percentage", { valueAsNumber: true })}
              />
              <span className="text-muted-foreground">%</span>
            </div>
            {form.formState.errors.allocation_percentage && (
              <p className="text-sm text-destructive">{form.formState.errors.allocation_percentage.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => form.setValue("color", color)}
                  className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    selectedColor === color ? "border-foreground ring-2 ring-ring ring-offset-2" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Label htmlFor="custom-color" className="text-sm text-muted-foreground">Custom:</Label>
              <Input
                id="custom-color"
                type="color"
                className="h-8 w-12 cursor-pointer p-0"
                value={selectedColor}
                onChange={(e) => form.setValue("color", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected">Expected Monthly Expense (optional)</Label>
            <Input
              id="expected"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              disabled={saving}
              {...form.register("expected_monthly_expense", {
                setValueAs: (v) => (v === "" ? null : parseFloat(v)),
              })}
            />
          </div>

          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">Inactive accounts won't receive allocations</p>
              </div>
              <Switch
                checked={form.watch("is_active")}
                onCheckedChange={(checked) => form.setValue("is_active", checked)}
                disabled={saving}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Expense Source"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
