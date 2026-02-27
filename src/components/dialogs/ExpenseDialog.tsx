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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, Loader2, AlertTriangle, TrendingUp, Landmark, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompany } from "@/contexts/CompanyContext";
import { useFundableInvestments, useFundableLoans } from "@/hooks/useFundTracking";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import type { ExpenseWithAccount } from "@/hooks/useExpenses";
import type { AccountBalance } from "@/hooks/useExpenses";

const expenseSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date is required"),
  expense_account_id: z.string().min(1, "Please select an expense source"),
  description: z.string().max(500).nullable(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

export interface ExpenseFormResult extends ExpenseFormData {
  funded_by_type?: string | null;
  funded_by_id?: string | null;
  funded_by_reference?: string | null;
  matches_loan_purpose?: boolean | null;
  purpose_notes?: string | null;
  invoice_number?: string | null;
  vendor_name?: string | null;
}

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: ExpenseWithAccount | null;
  accounts: AccountBalance[];
  onSave: (data: ExpenseFormResult) => Promise<void>;
}

export default function ExpenseDialog({ open, onOpenChange, expense, accounts, onSave }: ExpenseDialogProps) {
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const isEdit = !!expense;
  const { isCipher } = useCompany();
  const { fc, symbol } = useCompanyCurrency();

  // Fund tracking state
  const [fundingType, setFundingType] = useState<"company_funds" | "investment" | "loan">("company_funds");
  const [selectedFundId, setSelectedFundId] = useState<string>("");
  const [matchesPurpose, setMatchesPurpose] = useState<boolean>(true);
  const [purposeNotes, setPurposeNotes] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [vendorName, setVendorName] = useState("");

  const { data: fundableInvestments = [] } = useFundableInvestments();
  const { data: fundableLoans = [] } = useFundableLoans();

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { amount: 0, date: format(new Date(), "yyyy-MM-dd"), expense_account_id: "", description: null },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        amount: expense?.amount || 0,
        date: expense?.date || format(new Date(), "yyyy-MM-dd"),
        expense_account_id: expense?.expense_account_id || "",
        description: expense?.description || null,
      });
      // Reset fund tracking
      const e = expense as any;
      setFundingType(e?.funded_by_type || "company_funds");
      setSelectedFundId(e?.funded_by_id || "");
      setMatchesPurpose(e?.matches_loan_purpose !== false);
      setPurposeNotes(e?.purpose_notes || "");
      setInvoiceNumber(e?.invoice_number || "");
      setVendorName(e?.vendor_name || "");
    }
  }, [open, expense, form]);

  const handleSubmit = async (data: ExpenseFormData) => {
    // Validate fund allocation
    if (fundingType !== "company_funds" && selectedFundId) {
      const source = fundingType === "investment"
        ? fundableInvestments.find((i) => i.id === selectedFundId)
        : fundableLoans.find((l) => l.id === selectedFundId);
      if (source && data.amount > (Number((source as any).remaining_unallocated) || 0)) {
        form.setError("amount", { message: `Exceeds available funds (${fc(Number((source as any).remaining_unallocated))})` });
        return;
      }
    }

    setSaving(true);
    try {
      const fundRef = fundingType === "investment"
        ? fundableInvestments.find(i => i.id === selectedFundId)?.stakeholder_name + "'s Investment"
        : fundingType === "loan"
        ? fundableLoans.find(l => l.id === selectedFundId)?.stakeholder_name + "'s Loan"
        : null;

      await onSave({
        ...data,
        funded_by_type: fundingType === "company_funds" ? null : fundingType,
        funded_by_id: fundingType === "company_funds" ? null : selectedFundId || null,
        funded_by_reference: fundRef,
        matches_loan_purpose: fundingType === "loan" ? matchesPurpose : null,
        purpose_notes: fundingType === "loan" && !matchesPurpose ? purposeNotes : null,
        invoice_number: invoiceNumber || null,
        vendor_name: vendorName || null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const selectedDate = form.watch("date");
  const selectedAccountId = form.watch("expense_account_id");
  const amount = form.watch("amount");
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const projectedBalance = selectedAccount ? selectedAccount.balance - (isEdit ? amount - (expense?.amount || 0) : amount) : null;

  const selectedLoan = fundingType === "loan" ? fundableLoans.find(l => l.id === selectedFundId) : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && saving) return; onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => { if (saving) e.preventDefault(); }} onEscapeKeyDown={(e) => { if (saving) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense" : "Add Expense"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update expense entry" : "Record a spending from one of your expense sources"}</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Expense Source</Label>
            <Select value={form.watch("expense_account_id")} onValueChange={(value) => form.setValue("expense_account_id", value)} disabled={saving}>
              <SelectTrigger><SelectValue placeholder="Select an expense source" /></SelectTrigger>
              <SelectContent className="bg-popover">
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: account.color }} />
                      <span>{account.name}</span>
                      <span className="text-muted-foreground">({symbol}{account.balance.toLocaleString()} available)</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.expense_account_id && <p className="text-sm text-destructive">{form.formState.errors.expense_account_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({symbol})</Label>
            <Input id="amount" type="number" step="0.01" min="0.01" placeholder="0.00" disabled={saving} {...form.register("amount", { valueAsNumber: true })} />
            {form.formState.errors.amount && <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>}
          </div>

          {selectedAccount && projectedBalance !== null && projectedBalance < 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>This will create a deficit of {symbol}{Math.abs(projectedBalance).toLocaleString()} in {selectedAccount.name}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(new Date(selectedDate), "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="start">
                <Calendar mode="single" selected={selectedDate ? new Date(selectedDate) : undefined} onSelect={(date) => { if (date) { form.setValue("date", format(date, "yyyy-MM-dd")); setCalendarOpen(false); } }} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" placeholder="What was this expense for..." rows={2} disabled={saving} {...form.register("description")} />
          </div>

          {/* Funding Source Section - Cipher Only */}
          {isCipher && (
            <div className="space-y-3 border-t pt-4">
              <Label className="text-sm font-medium">Funding Source</Label>
              <RadioGroup value={fundingType} onValueChange={(v) => { setFundingType(v as any); setSelectedFundId(""); }} className="space-y-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="company_funds" id="fund-company" />
                  <Label htmlFor="fund-company" className="font-normal flex items-center gap-1.5 cursor-pointer">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Company's Own Funds
                  </Label>
                </div>
                {fundableInvestments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="investment" id="fund-investment" />
                    <Label htmlFor="fund-investment" className="font-normal flex items-center gap-1.5 cursor-pointer">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> From Investment
                    </Label>
                  </div>
                )}
                {fundableLoans.length > 0 && (
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="loan" id="fund-loan" />
                    <Label htmlFor="fund-loan" className="font-normal flex items-center gap-1.5 cursor-pointer">
                      <Landmark className="h-3.5 w-3.5 text-orange-500" /> From Loan
                    </Label>
                  </div>
                )}
              </RadioGroup>

              {fundingType === "investment" && (
                <Select value={selectedFundId} onValueChange={setSelectedFundId}>
                  <SelectTrigger><SelectValue placeholder="Select investment" /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {fundableInvestments.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        <div className="text-sm">
                          <span className="font-medium">{inv.stakeholder_name}</span>
                          <span className="text-muted-foreground"> — {symbol}{Number(inv.investment_amount).toLocaleString()}</span>
                          <span className="text-emerald-600 ml-1">(Avail: {symbol}{Number(inv.remaining_unallocated).toLocaleString()})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {fundingType === "loan" && (
                <>
                  <Select value={selectedFundId} onValueChange={setSelectedFundId}>
                    <SelectTrigger><SelectValue placeholder="Select loan" /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      {fundableLoans.map((loan) => (
                        <SelectItem key={loan.id} value={loan.id}>
                          <div className="text-sm">
                            <span className="font-medium">{loan.stakeholder_name}</span>
                            <span className="text-muted-foreground"> — {symbol}{Number(loan.loan_amount).toLocaleString()}</span>
                            <span className="text-emerald-600 ml-1">(Avail: {symbol}{Number(loan.remaining_unallocated).toLocaleString()})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedLoan?.stated_purpose && (
                    <div className="space-y-2">
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2 rounded text-sm">
                        <span className="text-muted-foreground">Loan Purpose:</span> <strong>{selectedLoan.stated_purpose}</strong>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Does this expense match the loan purpose?</Label>
                        <RadioGroup value={matchesPurpose ? "yes" : "no"} onValueChange={(v) => setMatchesPurpose(v === "yes")} className="flex gap-4">
                          <div className="flex items-center gap-1.5"><RadioGroupItem value="yes" id="match-yes" /><Label htmlFor="match-yes" className="font-normal text-sm cursor-pointer">Yes</Label></div>
                          <div className="flex items-center gap-1.5"><RadioGroupItem value="no" id="match-no" /><Label htmlFor="match-no" className="font-normal text-sm cursor-pointer">No</Label></div>
                        </RadioGroup>
                      </div>
                      {!matchesPurpose && (
                        <Textarea value={purposeNotes} onChange={(e) => setPurposeNotes(e.target.value)} rows={2} placeholder="Explain why this doesn't match the stated purpose..." className="text-sm" />
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Invoice / Vendor - shown for Cipher when funded */}
          {isCipher && fundingType !== "company_funds" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Invoice Number</Label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-001" className="text-sm" />
              </div>
              <div>
                <Label className="text-xs">Vendor Name</Label>
                <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Vendor" className="text-sm" />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
