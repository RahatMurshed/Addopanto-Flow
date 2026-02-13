import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RevenueWithSource } from "@/hooks/useRevenues";
import type { RevenueSource } from "@/hooks/useRevenueSources";

const revenueSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date is required"),
  source_id: z.string().nullable(),
  description: z.string().max(500).nullable(),
});

type RevenueFormData = z.infer<typeof revenueSchema>;

interface RevenueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revenue?: RevenueWithSource | null;
  sources: RevenueSource[];
  onSave: (data: RevenueFormData) => Promise<void>;
  onCreateSource: (name: string) => Promise<void>;
}

export default function RevenueDialog({
  open,
  onOpenChange,
  revenue,
  sources,
  onSave,
  onCreateSource,
}: RevenueDialogProps) {
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [addingSource, setAddingSource] = useState(false);
  const isEdit = !!revenue;

  const form = useForm<RevenueFormData>({
    resolver: zodResolver(revenueSchema),
    defaultValues: {
      amount: 0,
      date: format(new Date(), "yyyy-MM-dd"),
      source_id: null,
      description: null,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        amount: revenue?.amount || 0,
        date: revenue?.date || format(new Date(), "yyyy-MM-dd"),
        source_id: revenue?.source_id || null,
        description: revenue?.description || null,
      });
    }
  }, [open, revenue, form]);

  const handleSubmit = async (data: RevenueFormData) => {
    setSaving(true);
    try {
      await onSave(data);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSource = async () => {
    if (!newSourceName.trim()) return;
    setAddingSource(true);
    try {
      await onCreateSource(newSourceName.trim());
      setNewSourceName("");
    } finally {
      setAddingSource(false);
    }
  };

  const selectedDate = form.watch("date");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && saving) return; onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => { if (saving) e.preventDefault(); }} onEscapeKeyDown={(e) => { if (saving) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Revenue" : "Add Revenue"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update revenue entry" : "Record income and automatically allocate to khatas"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (৳)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              disabled={saving}
              {...form.register("amount", { valueAsNumber: true })}
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(new Date(selectedDate), "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate ? new Date(selectedDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      form.setValue("date", format(date, "yyyy-MM-dd"));
                      setCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Source (optional)</Label>
            <Select
              value={form.watch("source_id") || "none"}
              onValueChange={(value) => form.setValue("source_id", value === "none" ? null : value)}
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a source" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="none">No source</SelectItem>
                {sources.map((source) => (
                  <SelectItem key={source.id} value={source.id}>
                    {source.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                placeholder="New source name"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSource())}
                disabled={saving}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddSource}
                disabled={addingSource || !newSourceName.trim()}
              >
                {addingSource ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add notes about this revenue..."
              rows={3}
              disabled={saving}
              {...form.register("description")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Revenue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
