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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarIcon, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExpenseWithAccount } from "@/hooks/useExpenses";
import type { AccountBalance } from "@/hooks/useExpenses";

const expenseSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date is required"),
  expense_account_id: z.string().min(1, "Please select a khata"),
  description: z.string().max(500).nullable(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: ExpenseWithAccount | null;
  accounts: AccountBalance[];
  onSave: (data: ExpenseFormData) => Promise<void>;
}

export default function ExpenseDialog({
  open,
  onOpenChange,
  expense,
  accounts,
  onSave,
}: ExpenseDialogProps) {
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const isEdit = !!expense;

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: 0,
      date: format(new Date(), "yyyy-MM-dd"),
      expense_account_id: "",
      description: null,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        amount: expense?.amount || 0,
        date: expense?.date || format(new Date(), "yyyy-MM-dd"),
        expense_account_id: expense?.expense_account_id || "",
        description: expense?.description || null,
      });
    }
  }, [open, expense, form]);

  const handleSubmit = async (data: ExpenseFormData) => {
    setSaving(true);
    try {
      await onSave(data);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const selectedDate = form.watch("date");
  const selectedAccountId = form.watch("expense_account_id");
  const amount = form.watch("amount");

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const projectedBalance = selectedAccount
    ? selectedAccount.balance - (isEdit ? amount - (expense?.amount || 0) : amount)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense" : "Add Expense"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update expense entry" : "Record a spending from one of your khatas"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Khata (Expense Account)</Label>
            <Select
              value={form.watch("expense_account_id")}
              onValueChange={(value) => form.setValue("expense_account_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a khata" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: account.color }}
                      />
                      <span>{account.name}</span>
                      <span className="text-muted-foreground">
                        (৳{account.balance.toLocaleString()} available)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.expense_account_id && (
              <p className="text-sm text-destructive">
                {form.formState.errors.expense_account_id.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (৳)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              {...form.register("amount", { valueAsNumber: true })}
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>

          {selectedAccount && projectedBalance !== null && projectedBalance < 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will create a deficit of ৳{Math.abs(projectedBalance).toLocaleString()} in {selectedAccount.name}
              </AlertDescription>
            </Alert>
          )}

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
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What was this expense for..."
              rows={3}
              {...form.register("description")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
