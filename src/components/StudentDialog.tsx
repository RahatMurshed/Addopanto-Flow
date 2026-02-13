import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Student, StudentInsert } from "@/hooks/useStudents";

const studentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  student_id_number: z.string().max(50).nullable().optional(),
  email: z.string().email("Invalid email").nullable().optional().or(z.literal("")),
  phone: z.string().max(20).nullable().optional(),
  enrollment_date: z.string().min(1, "Enrollment date is required"),
  billing_start_month: z.string().regex(/^\d{4}-\d{2}$/, "Format: YYYY-MM"),
  admission_fee_total: z.number().min(0, "Must be >= 0"),
  monthly_fee_amount: z.number().min(0, "Must be >= 0"),
  status: z.enum(["active", "inactive", "graduated"]),
  notes: z.string().max(500).nullable().optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface StudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
  onSave: (data: StudentInsert) => Promise<void>;
}

export default function StudentDialog({ open, onOpenChange, student, onSave }: StudentDialogProps) {
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const isEdit = !!student;

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: "",
      student_id_number: null,
      email: null,
      phone: null,
      enrollment_date: format(new Date(), "yyyy-MM-dd"),
      billing_start_month: currentYearMonth,
      admission_fee_total: 0,
      monthly_fee_amount: 0,
      status: "active",
      notes: null,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: student?.name || "",
        student_id_number: student?.student_id_number || null,
        email: student?.email || null,
        phone: student?.phone || null,
        enrollment_date: student?.enrollment_date || format(new Date(), "yyyy-MM-dd"),
        billing_start_month: student?.billing_start_month || currentYearMonth,
        admission_fee_total: student ? Number(student.admission_fee_total) : 0,
        monthly_fee_amount: student ? Number(student.monthly_fee_amount) : 0,
        status: student?.status || "active",
        notes: student?.notes || null,
      });
    }
  }, [open, student, form]);

  const handleSubmit = async (data: StudentFormData) => {
    setSaving(true);
    try {
      await onSave({
        name: data.name,
        student_id_number: data.student_id_number || null,
        email: data.email || null,
        phone: data.phone || null,
        enrollment_date: data.enrollment_date,
        billing_start_month: data.billing_start_month,
        admission_fee_total: data.admission_fee_total,
        monthly_fee_amount: data.monthly_fee_amount,
        status: data.status,
        notes: data.notes || null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const selectedDate = form.watch("enrollment_date");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && saving) return; onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => { if (saving) e.preventDefault(); }} onEscapeKeyDown={(e) => { if (saving) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Student" : "Add Student"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update student information" : "Create a new student profile"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" disabled={saving} {...form.register("name")} />
              {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="student_id_number">Student ID</Label>
              <Input id="student_id_number" placeholder="e.g. STU-001" disabled={saving} {...form.register("student_id_number")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" disabled={saving} {...form.register("email")} />
              {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" disabled={saving} {...form.register("phone")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Enrollment Date *</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(new Date(selectedDate), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
                  <Calendar mode="single" selected={selectedDate ? new Date(selectedDate) : undefined} onSelect={(date) => { if (date) { form.setValue("enrollment_date", format(date, "yyyy-MM-dd")); setCalendarOpen(false); } }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing_start_month">First Billing Month *</Label>
              <Input id="billing_start_month" placeholder="YYYY-MM" disabled={saving} {...form.register("billing_start_month")} />
              {form.formState.errors.billing_start_month && <p className="text-sm text-destructive">{form.formState.errors.billing_start_month.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admission_fee_total">Admission Fee Total</Label>
              <Input id="admission_fee_total" type="number" step="0.01" min="0" disabled={saving} {...form.register("admission_fee_total", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly_fee_amount">Monthly Fee Amount</Label>
              <Input id="monthly_fee_amount" type="number" step="0.01" min="0" disabled={saving} {...form.register("monthly_fee_amount", { valueAsNumber: true })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as any)} disabled={saving}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="graduated">Graduated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} disabled={saving} {...form.register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
