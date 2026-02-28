import { useState, useEffect, useMemo } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Student, StudentInsert } from "@/hooks/useStudents";
import { useCreateStudentPayment } from "@/hooks/useStudentPayments";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import InitialPaymentSection, { type InitialPaymentData } from "@/components/finance/InitialPaymentSection";
import { useToast } from "@/hooks/use-toast";
import { useBatches, type Batch } from "@/hooks/useBatches";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { syncBatchEnrollment } from "@/utils/enrollmentSync";


const yyyyMmRegex = /^\d{4}-\d{2}$/;

const studentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  student_id_number: z.string().max(50).nullable().optional(),
  email: z.string().email("Invalid email").nullable().optional().or(z.literal("")),
  phone: z.string().max(20).nullable().optional(),
  enrollment_date: z.string().min(1, "Enrollment date is required"),
  billing_start_month: z.string().regex(yyyyMmRegex, "Format: YYYY-MM"),
  course_start_month: z.string().regex(yyyyMmRegex, "Format: YYYY-MM").nullable().optional().or(z.literal("")),
  course_end_month: z.string().regex(yyyyMmRegex, "Format: YYYY-MM").nullable().optional().or(z.literal("")),
  admission_fee_total: z.number().min(0, "Must be >= 0"),
  monthly_fee_amount: z.number().min(0, "Must be >= 0"),
  status: z.enum(["active", "inactive", "graduated", "dropout", "transferred", "inquiry"]),
  notes: z.string().max(500).nullable().optional(),
}).refine((data) => {
  if (data.course_start_month && data.course_end_month) {
    return data.course_end_month >= data.course_start_month;
  }
  return true;
}, { message: "Course end must be after start", path: ["course_end_month"] });

type StudentFormData = z.infer<typeof studentSchema>;

interface StudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
  onSave: (data: StudentInsert) => Promise<Student | void>;
  defaultBatchId?: string;
  lockedBatch?: boolean;
}

const defaultPayment: InitialPaymentData = {
  paymentType: "admission",
  admissionAmount: 0,
  monthlyMonths: [],
  monthlyAmount: 0,
  paymentMethod: "cash",
  receiptNumber: "",
};

export default function StudentDialog({ open, onOpenChange, student, onSave, defaultBatchId, lockedBatch }: StudentDialogProps) {
  const [saving, setSaving] = useState(false);
  const [savingStep, setSavingStep] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [initialPayment, setInitialPayment] = useState<InitialPaymentData>(defaultPayment);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(defaultBatchId || "none");
  const isEdit = !!student;

  const createPaymentMutation = useCreateStudentPayment();
  const { fc: formatCurrency, currencyCode: currency } = useCompanyCurrency();
  const { toast } = useToast();
  const { data: batches = [] } = useBatches({ status: "active" });
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Get selected batch details
  const selectedBatch = useMemo(
    () => (selectedBatchId !== "none" ? batches.find((b) => b.id === selectedBatchId) : null),
    [selectedBatchId, batches]
  );

  // Whether batch is selected (hide inherited fields in both create and edit)
  const hasBatchSelected = !!selectedBatch;

  // Compute course start/end from batch
  const batchCourseStartMonth = useMemo(() => {
    if (!selectedBatch) return "";
    const d = new Date(selectedBatch.start_date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [selectedBatch]);

  const batchCourseEndMonth = useMemo(() => {
    if (!selectedBatch || !selectedBatch.course_duration_months) return "";
    const d = new Date(selectedBatch.start_date);
    d.setMonth(d.getMonth() + selectedBatch.course_duration_months - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [selectedBatch]);

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
        course_start_month: student?.course_start_month || "",
        course_end_month: student?.course_end_month || "",
        admission_fee_total: student ? Number(student.admission_fee_total) : 0,
        monthly_fee_amount: student ? Number(student.monthly_fee_amount) : 0,
        status: student?.status || "active",
        notes: student?.notes || null,
      });
      setInitialPayment(defaultPayment);
      setSelectedBatchId(defaultBatchId || (student as any)?.batch_id || "none");
    }
  }, [open, student, form, defaultBatchId]);

  // Auto-set fees and course months when batch changes in create mode
  useEffect(() => {
    if (!isEdit && selectedBatch) {
      form.setValue("admission_fee_total", Number(selectedBatch.default_admission_fee));
      form.setValue("monthly_fee_amount", Number(selectedBatch.default_monthly_fee));
      if (batchCourseStartMonth) form.setValue("course_start_month", batchCourseStartMonth);
      if (batchCourseEndMonth) form.setValue("course_end_month", batchCourseEndMonth);
    }
  }, [selectedBatch, isEdit, batchCourseStartMonth, batchCourseEndMonth, form]);

  const hasInitialPayment = !isEdit && (
    (initialPayment.paymentType === "admission" || initialPayment.paymentType === "both") && initialPayment.admissionAmount > 0 ||
    (initialPayment.paymentType === "monthly" || initialPayment.paymentType === "both") && initialPayment.monthlyMonths.length > 0
  );

  const handleSubmit = async (data: StudentFormData) => {
    setSaving(true);
    try {
      setSavingStep("Creating student...");
      const billingMonth = data.billing_start_month || data.course_start_month || currentYearMonth;
      const newBatchId = selectedBatchId !== "none" ? selectedBatchId : null;
      const result = await onSave({
        name: data.name,
        student_id_number: data.student_id_number || null,
        email: data.email || null,
        phone: data.phone || null,
        enrollment_date: data.enrollment_date,
        billing_start_month: billingMonth,
        course_start_month: data.course_start_month || null,
        course_end_month: data.course_end_month || null,
        admission_fee_total: data.admission_fee_total,
        monthly_fee_amount: data.monthly_fee_amount,
        status: data.status,
        notes: data.notes || null,
        batch_id: newBatchId || undefined,
      } as StudentInsert);

      // Sync batch enrollment
      if (activeCompanyId && user) {
        try {
          if (isEdit && student) {
            await syncBatchEnrollment(
              student.id,
              student.batch_id,
              newBatchId,
              activeCompanyId,
              user.id
            );
          } else if (result && "id" in result) {
            await syncBatchEnrollment(
              result.id,
              null,
              newBatchId,
              activeCompanyId,
              user.id
            );
          }
        } catch (e: any) {
          console.error("Failed to sync batch enrollment:", e);
        }
      }

      // Record initial payment if configured
      if (hasInitialPayment && result && "id" in result) {
        setSavingStep("Recording payment...");
        const showAdmission = initialPayment.paymentType === "admission" || initialPayment.paymentType === "both";
        const showMonthly = initialPayment.paymentType === "monthly" || initialPayment.paymentType === "both";

        try {
          if (showAdmission && initialPayment.admissionAmount > 0) {
            await createPaymentMutation.mutateAsync({
              student_id: result.id,
              payment_type: "admission",
              amount: initialPayment.admissionAmount,
              payment_date: format(new Date(), "yyyy-MM-dd"),
              payment_method: initialPayment.paymentMethod,
              receipt_number: initialPayment.receiptNumber || null,
              due_date: format(new Date(), "yyyy-MM-dd"),
              studentName: data.name,
            });
          }
          if (showMonthly && initialPayment.monthlyMonths.length > 0 && initialPayment.monthlyAmount > 0) {
            await createPaymentMutation.mutateAsync({
              student_id: result.id,
              payment_type: "monthly",
              amount: initialPayment.monthlyAmount,
              payment_date: format(new Date(), "yyyy-MM-dd"),
              payment_method: initialPayment.paymentMethod,
              months_covered: initialPayment.monthlyMonths,
              receipt_number: initialPayment.receiptNumber || null,
              due_date: `${initialPayment.monthlyMonths.sort()[0]}-01`,
              studentName: data.name,
            });
          }
        } catch (payErr: any) {
          toast({
            title: "Student created but payment failed",
            description: payErr.message,
            variant: "destructive",
          });
        }
      }

      onOpenChange(false);
    } finally {
      setSaving(false);
      setSavingStep("");
    }
  };

  const selectedDate = form.watch("enrollment_date");
  const watchedAdmission = form.watch("admission_fee_total");
  const watchedMonthly = form.watch("monthly_fee_amount");
  const watchedBillingStart = form.watch("billing_start_month");

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
          {/* Batch Selector */}
          <div className="space-y-2">
            <Label>Batch</Label>
            <Select value={selectedBatchId} onValueChange={(v) => {
              setSelectedBatchId(v);
              // Reset initial payment when batch changes
              if (!isEdit) setInitialPayment(defaultPayment);
            }} disabled={saving || lockedBatch}>
              <SelectTrigger><SelectValue placeholder="Select batch (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Batch</SelectItem>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.batch_name} ({b.batch_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Show batch-inherited fees as info badges */}
          {hasBatchSelected && (
            <div className="rounded-md border bg-muted/50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                Inherited from batch
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  Admission: {formatCurrency(Number(selectedBatch!.default_admission_fee), currency)}
                </Badge>
                <Badge variant="secondary">
                  Monthly: {formatCurrency(Number(selectedBatch!.default_monthly_fee), currency)}
                </Badge>
                {selectedBatch!.course_duration_months && (
                  <Badge variant="secondary">
                    Duration: {selectedBatch!.course_duration_months} months
                  </Badge>
                )}
                {batchCourseStartMonth && (
                  <Badge variant="outline">
                    {batchCourseStartMonth} → {batchCourseEndMonth || "—"}
                  </Badge>
                )}
              </div>
            </div>
          )}

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

          {/* Course Start/End — only show when NO batch selected, or in edit mode */}
          {(!hasBatchSelected) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="course_start_month">Course Start Month</Label>
                <Input id="course_start_month" placeholder="YYYY-MM" disabled={saving} {...form.register("course_start_month")} />
                {form.formState.errors.course_start_month && <p className="text-sm text-destructive">{form.formState.errors.course_start_month.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="course_end_month">Course End Month</Label>
                <Input id="course_end_month" placeholder="YYYY-MM" disabled={saving} {...form.register("course_end_month")} />
                {form.formState.errors.course_end_month && <p className="text-sm text-destructive">{form.formState.errors.course_end_month.message}</p>}
              </div>
            </div>
          )}

          {/* Admission/Monthly Fee — only show when NO batch selected, or in edit mode */}
          {(!hasBatchSelected) && (
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
          )}

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as any)} disabled={saving}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inquiry">Inquiry</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="graduated">Graduated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} disabled={saving} {...form.register("notes")} />
          </div>

          {/* Initial Payment Section (create mode only) */}
          {!isEdit && (watchedAdmission > 0 || watchedMonthly > 0) && (
            <>
              <Separator />
              <InitialPaymentSection
                admissionFeeTotal={watchedAdmission}
                monthlyFeeAmount={watchedMonthly}
                billingStartMonth={watchedBillingStart}
                currency={currency}
                disabled={saving}
                value={initialPayment}
                onChange={setInitialPayment}
              />
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? savingStep || "Saving..." : isEdit ? "Save Changes" : "Add Student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
