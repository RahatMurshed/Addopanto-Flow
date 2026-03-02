import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addMonths, addDays } from "date-fns";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Batch, BatchInsert } from "@/hooks/useBatches";

const batchSchema = z.object({
  batch_name: z.string().trim().min(1, "Name is required").max(100),
  batch_code: z.string().trim().min(1, "Code is required").max(50),
  description: z.string().max(500).nullable().optional(),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().nullable().optional().or(z.literal("")),
  course_duration_months: z.number().min(0).nullable().optional(),
  course_duration_days: z.number().min(0).max(30).nullable().optional(),
  payment_mode: z.enum(["one_time", "monthly"]),
  default_admission_fee: z.number().min(0),
  default_monthly_fee: z.number().min(0),
  max_capacity: z.number().min(1).nullable().optional(),
  status: z.enum(["active", "completed", "archived"]),
}).refine((data) => {
  if (data.end_date && data.start_date && data.end_date <= data.start_date) {
    return false;
  }
  return true;
}, { message: "End date must be after start date", path: ["end_date"] })
.refine((data) => {
  const m = data.course_duration_months || 0;
  const d = data.course_duration_days || 0;
  return m > 0 || d > 0;
}, { message: "Duration must be at least 1 day or 1 month", path: ["course_duration_days"] });

type BatchFormData = z.infer<typeof batchSchema>;

interface BatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch?: Batch | null;
  onSave: (data: BatchInsert) => Promise<any>;
  courseId?: string;
  courseDurationMonths?: number | null;
}

function generateBatchCode(name: string): string {
  const year = new Date().getFullYear();
  const slug = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
  return `${slug}-${year}`;
}

export default function BatchDialog({ open, onOpenChange, batch, onSave, courseId, courseDurationMonths }: BatchDialogProps) {
  const [saving, setSaving] = useState(false);
  const [startCalOpen, setStartCalOpen] = useState(false);
  const [endCalOpen, setEndCalOpen] = useState(false);
  const { toast } = useToast();
  const isEdit = !!batch;

  const form = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      batch_name: "",
      batch_code: "",
      description: null,
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: "",
      course_duration_months: null,
      course_duration_days: null,
      payment_mode: "monthly",
      default_admission_fee: 0,
      default_monthly_fee: 0,
      max_capacity: null,
      status: "active",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        batch_name: batch?.batch_name || "",
        batch_code: batch?.batch_code || "",
        description: batch?.description || null,
        start_date: batch?.start_date || format(new Date(), "yyyy-MM-dd"),
        end_date: batch?.end_date || "",
        course_duration_months: batch?.course_duration_months ?? courseDurationMonths ?? null,
        course_duration_days: (batch as any)?.course_duration_days ?? null,
        payment_mode: (batch as any)?.payment_mode || "monthly",
        default_admission_fee: batch ? Number(batch.default_admission_fee) : 0,
        default_monthly_fee: batch ? Number(batch.default_monthly_fee) : 0,
        max_capacity: batch?.max_capacity ?? null,
        status: (batch?.status as any) || "active",
      });
    }
  }, [open, batch, form]);

  // Auto-generate batch code from name (create mode only)
  const watchedName = form.watch("batch_name");
  useEffect(() => {
    if (!isEdit && watchedName && !form.getValues("batch_code")) {
      form.setValue("batch_code", generateBatchCode(watchedName));
    }
  }, [watchedName, isEdit, form]);

  const paymentMode = form.watch("payment_mode");

  // Auto-suggest end date when start date + duration changes
  const watchedStartDate = form.watch("start_date");
  const watchedDurationMonths = form.watch("course_duration_months");
  const watchedDurationDays = form.watch("course_duration_days");

  useEffect(() => {
    if (!watchedStartDate) return;
    const m = watchedDurationMonths || 0;
    const d = watchedDurationDays || 0;
    if (m === 0 && d === 0) return;
    
    let endDate = new Date(watchedStartDate);
    if (m > 0) endDate = addMonths(endDate, m);
    if (d > 0) endDate = addDays(endDate, d);
    
    // Only auto-set if user hasn't manually set an end date or in create mode
    if (!isEdit || !form.getValues("end_date")) {
      form.setValue("end_date", format(endDate, "yyyy-MM-dd"));
    }
  }, [watchedStartDate, watchedDurationMonths, watchedDurationDays]);

  const handleSubmit = async (data: BatchFormData) => {
    setSaving(true);
    try {
      // Validate capacity isn't being set below current enrollment count
      if (isEdit && batch && data.max_capacity != null) {
        const { count } = await supabase
          .from("batch_enrollments")
          .select("id", { count: "exact", head: true })
          .eq("batch_id", batch.id)
          .eq("status", "active");
        const currentCount = count ?? 0;
        if (data.max_capacity < currentCount) {
          toast({
            title: "Invalid capacity",
            description: `Cannot set capacity to ${data.max_capacity}. There are currently ${currentCount} enrolled students.`,
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
      }

      await onSave({
        batch_name: data.batch_name,
        batch_code: data.batch_code,
        description: data.description || null,
        start_date: data.start_date,
        end_date: data.end_date || null,
        course_duration_months: data.course_duration_months ?? null,
        course_duration_days: data.course_duration_days ?? null,
        payment_mode: data.payment_mode,
        default_admission_fee: data.default_admission_fee,
        default_monthly_fee: data.payment_mode === "one_time" ? 0 : data.default_monthly_fee,
        max_capacity: data.max_capacity ?? null,
        status: data.status,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const selectedStartDate = form.watch("start_date");
  const selectedEndDate = form.watch("end_date");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && saving) return; onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => { if (saving) e.preventDefault(); }} onEscapeKeyDown={(e) => { if (saving) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Batch" : "Create Batch"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update batch information" : "Create a new batch to group students"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="batch_name">Batch Name *</Label>
              <Input id="batch_name" placeholder="e.g. Batch - 1" disabled={saving} {...form.register("batch_name")} />
              {form.formState.errors.batch_name && <p className="text-sm text-destructive">{form.formState.errors.batch_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch_code">Batch Code *</Label>
              <Input id="batch_code" placeholder="e.g. BATCH-2024-01" disabled={saving} {...form.register("batch_code")} />
              {form.formState.errors.batch_code && <p className="text-sm text-destructive">{form.formState.errors.batch_code.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Popover open={startCalOpen} onOpenChange={setStartCalOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedStartDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedStartDate ? format(new Date(selectedStartDate), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
                  <Calendar mode="single" selected={selectedStartDate ? new Date(selectedStartDate) : undefined} onSelect={(date) => { if (date) { form.setValue("start_date", format(date, "yyyy-MM-dd")); setStartCalOpen(false); } }} initialFocus />
                </PopoverContent>
              </Popover>
              {selectedStartDate && selectedStartDate < format(new Date(), "yyyy-MM-dd") && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400">⚠ Start date is in the past. Past months will appear as overdue for enrolled students.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover open={endCalOpen} onOpenChange={setEndCalOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedEndDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedEndDate ? format(new Date(selectedEndDate), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
                  <Calendar mode="single" selected={selectedEndDate ? new Date(selectedEndDate) : undefined} onSelect={(date) => { if (date) { form.setValue("end_date", format(date, "yyyy-MM-dd")); setEndCalOpen(false); } else { form.setValue("end_date", ""); } }} initialFocus />
                </PopoverContent>
              </Popover>
              {form.formState.errors.end_date && <p className="text-sm text-destructive">{form.formState.errors.end_date.message}</p>}
            </div>
          </div>

          {/* Duration: Months + Days */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="course_duration_months">Duration (Months)</Label>
              <Input id="course_duration_months" type="number" min="0" placeholder="0" disabled={saving} {...form.register("course_duration_months", { valueAsNumber: true, setValueAs: (v) => v === "" || v === undefined ? null : Number(v) })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course_duration_days">Duration (Days)</Label>
              <Input id="course_duration_days" type="number" min="0" max="30" placeholder="0" disabled={saving} {...form.register("course_duration_days", { valueAsNumber: true, setValueAs: (v) => v === "" || v === undefined ? null : Number(v) })} />
              {form.formState.errors.course_duration_days && <p className="text-sm text-destructive">{form.formState.errors.course_duration_days.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_capacity">Max Capacity</Label>
              <Input id="max_capacity" type="number" min="1" disabled={saving} {...form.register("max_capacity", { valueAsNumber: true, setValueAs: (v) => v === "" || v === undefined ? null : Number(v) })} />
            </div>
          </div>

          {/* Payment Mode */}
          <div className="space-y-3">
            <Label>Payment Mode *</Label>
            <RadioGroup
              value={paymentMode}
              onValueChange={(v) => form.setValue("payment_mode", v as "one_time" | "monthly")}
              className="flex gap-4"
              disabled={saving}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="pm_monthly" />
                <Label htmlFor="pm_monthly" className="font-normal cursor-pointer">Monthly Payment</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="one_time" id="pm_onetime" />
                <Label htmlFor="pm_onetime" className="font-normal cursor-pointer">One-Time Payment</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Fee Fields - adapt based on payment mode */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="default_admission_fee">
                {paymentMode === "one_time" ? "Course Fee (One-Time)" : "Default Admission Fee"}
              </Label>
              <Input id="default_admission_fee" type="number" step="0.01" min="0" disabled={saving} {...form.register("default_admission_fee", { valueAsNumber: true })} />
            </div>
            {paymentMode === "monthly" && (
              <div className="space-y-2">
                <Label htmlFor="default_monthly_fee">Default Monthly Fee</Label>
                <Input id="default_monthly_fee" type="number" step="0.01" min="0" disabled={saving} {...form.register("default_monthly_fee", { valueAsNumber: true })} />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as any)} disabled={saving}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={2} disabled={saving} {...form.register("description")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Batch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
