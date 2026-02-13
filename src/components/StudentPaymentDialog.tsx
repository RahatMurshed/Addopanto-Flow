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
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Student } from "@/hooks/useStudents";
import type { StudentPaymentInsert, StudentSummary } from "@/hooks/useStudentPayments";

const paymentSchema = z.object({
  payment_type: z.enum(["admission", "monthly"]),
  amount: z.number().positive("Amount must be positive"),
  payment_date: z.string().min(1, "Date is required"),
  payment_method: z.string().min(1),
  receipt_number: z.string().max(50).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface StudentPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student;
  summary: StudentSummary;
  onSave: (data: StudentPaymentInsert & { studentName?: string }) => Promise<void>;
}

export default function StudentPaymentDialog({ open, onOpenChange, student, summary, onSave }: StudentPaymentDialogProps) {
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_type: summary.admissionStatus !== "paid" ? "admission" : "monthly",
      amount: 0,
      payment_date: format(new Date(), "yyyy-MM-dd"),
      payment_method: "cash",
      receipt_number: null,
      description: null,
    },
  });

  const paymentType = form.watch("payment_type");

  // Available unpaid months for monthly payments
  const unpaidMonths = useMemo(() => {
    return [...summary.monthlyOverdueMonths, ...summary.monthlyPendingMonths].sort();
  }, [summary]);

  useEffect(() => {
    if (open) {
      const defaultType = summary.admissionStatus !== "paid" ? "admission" : "monthly";
      form.reset({
        payment_type: defaultType,
        amount: 0,
        payment_date: format(new Date(), "yyyy-MM-dd"),
        payment_method: "cash",
        receipt_number: null,
        description: null,
      });
      setSelectedMonths([]);
    }
  }, [open, summary, form]);

  // Auto-calculate amount when months change
  useEffect(() => {
    if (paymentType === "monthly" && selectedMonths.length > 0) {
      const total = selectedMonths.length * Number(student.monthly_fee_amount);
      form.setValue("amount", total);
    }
  }, [selectedMonths, paymentType, student.monthly_fee_amount, form]);

  const toggleMonth = (month: string) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
    );
  };

  const handleSubmit = async (data: PaymentFormData) => {
    setSaving(true);
    try {
      await onSave({
        student_id: student.id,
        payment_type: data.payment_type,
        amount: data.amount,
        payment_date: data.payment_date,
        payment_method: data.payment_method,
        months_covered: data.payment_type === "monthly" ? selectedMonths : null,
        receipt_number: data.receipt_number || null,
        description: data.description || null,
        studentName: student.name,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const selectedDate = form.watch("payment_date");

  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-");
    const date = new Date(Number(y), Number(mo) - 1);
    return format(date, "MMM yyyy");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && saving) return; onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => { if (saving) e.preventDefault(); }} onEscapeKeyDown={(e) => { if (saving) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>Payment for {student.name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Payment Type</Label>
            <Select value={paymentType} onValueChange={(v) => { form.setValue("payment_type", v as any); setSelectedMonths([]); }} disabled={saving}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admission">Admission Fee</SelectItem>
                <SelectItem value="monthly">Monthly Tuition</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentType === "admission" && summary.admissionTotal > 0 && (
            <div className="rounded-md border p-3 text-sm">
              <p>Total: {summary.admissionTotal} | Paid: {summary.admissionPaid} | Pending: {summary.admissionTotal - summary.admissionPaid}</p>
            </div>
          )}

          {paymentType === "monthly" && unpaidMonths.length > 0 && (
            <div className="space-y-2">
              <Label>Select Months</Label>
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto rounded-md border p-2">
                {unpaidMonths.map((m) => (
                  <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={selectedMonths.includes(m)} onCheckedChange={() => toggleMonth(m)} />
                    <span className={summary.monthlyOverdueMonths.includes(m) ? "text-destructive font-medium" : ""}>{formatMonth(m)}</span>
                  </label>
                ))}
              </div>
              {selectedMonths.length > 0 && (
                <p className="text-xs text-muted-foreground">{selectedMonths.length} month(s) × {student.monthly_fee_amount} = {selectedMonths.length * Number(student.monthly_fee_amount)} (editable below)</p>
              )}
            </div>
          )}

          {paymentType === "monthly" && unpaidMonths.length === 0 && (
            <p className="text-sm text-muted-foreground">All months are paid! You can still record an advance payment by entering the amount manually.</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" type="number" step="0.01" min="0.01" disabled={saving} {...form.register("amount", { valueAsNumber: true })} />
            {form.formState.errors.amount && <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(new Date(selectedDate), "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="start">
                <Calendar mode="single" selected={selectedDate ? new Date(selectedDate) : undefined} onSelect={(date) => { if (date) { form.setValue("payment_date", format(date, "yyyy-MM-dd")); setCalendarOpen(false); } }} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={form.watch("payment_method")} onValueChange={(v) => form.setValue("payment_method", v)} disabled={saving}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt_number">Receipt Number</Label>
            <Input id="receipt_number" disabled={saving} {...form.register("receipt_number")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Notes</Label>
            <Textarea id="description" rows={2} disabled={saving} {...form.register("description")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
