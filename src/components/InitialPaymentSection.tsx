import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronRight, Receipt } from "lucide-react";
import { formatCurrency } from "@/utils/currencyUtils";

export interface InitialPaymentData {
  paymentType: "admission" | "monthly" | "both";
  admissionAmount: number;
  monthlyMonths: string[];
  monthlyAmount: number;
  paymentMethod: string;
  receiptNumber: string;
}

interface InitialPaymentSectionProps {
  admissionFeeTotal: number;
  monthlyFeeAmount: number;
  billingStartMonth: string;
  currency: string;
  disabled: boolean;
  value: InitialPaymentData;
  onChange: (data: InitialPaymentData) => void;
}

function generateInitialMonths(billingStart: string, count: number = 6): string[] {
  if (!billingStart || !/^\d{4}-\d{2}$/.test(billingStart)) return [];
  const months: string[] = [];
  let [year, month] = billingStart.split("-").map(Number);
  for (let i = 0; i < count; i++) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month++;
    if (month > 12) { month = 1; year++; }
  }
  return months;
}

function formatMonth(m: string) {
  const [y, mo] = m.split("-");
  return format(new Date(Number(y), Number(mo) - 1), "MMM yyyy");
}

export default function InitialPaymentSection({
  admissionFeeTotal, monthlyFeeAmount, billingStartMonth, currency, disabled, value, onChange,
}: InitialPaymentSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const availableMonths = useMemo(
    () => generateInitialMonths(billingStartMonth, 12),
    [billingStartMonth]
  );

  const showAdmission = value.paymentType === "admission" || value.paymentType === "both";
  const showMonthly = value.paymentType === "monthly" || value.paymentType === "both";

  // Auto-calc monthly amount when months change
  useEffect(() => {
    if (showMonthly && value.monthlyMonths.length > 0) {
      onChange({ ...value, monthlyAmount: value.monthlyMonths.length * monthlyFeeAmount });
    }
  }, [value.monthlyMonths.length, monthlyFeeAmount]);

  const totalInitialPayment =
    (showAdmission ? value.admissionAmount : 0) +
    (showMonthly ? value.monthlyAmount : 0);

  const admissionRemaining = Math.max(0, admissionFeeTotal - (showAdmission ? value.admissionAmount : 0));
  const monthlyPendingAfter = 0; // All selected months are being paid

  const totalPendingAfter = admissionRemaining;

  const toggleMonth = (month: string) => {
    const newMonths = value.monthlyMonths.includes(month)
      ? value.monthlyMonths.filter((m) => m !== month)
      : [...value.monthlyMonths, month].sort();
    onChange({ ...value, monthlyMonths: newMonths });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" type="button" className="w-full justify-between px-0 hover:bg-transparent" disabled={disabled}>
          <span className="flex items-center gap-2 text-sm font-medium">
            <Receipt className="h-4 w-4" />
            Record initial payment
          </span>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-2">
        {/* Payment Type */}
        <div className="space-y-2">
          <Label>Payment Type</Label>
          <RadioGroup
            value={value.paymentType}
            onValueChange={(v) => onChange({ ...value, paymentType: v as any })}
            className="flex gap-4"
            disabled={disabled}
          >
            {admissionFeeTotal > 0 && (
              <div className="flex items-center gap-2">
                <RadioGroupItem value="admission" id="pt-admission" />
                <Label htmlFor="pt-admission" className="font-normal cursor-pointer">Admission</Label>
              </div>
            )}
            {monthlyFeeAmount > 0 && (
              <div className="flex items-center gap-2">
                <RadioGroupItem value="monthly" id="pt-monthly" />
                <Label htmlFor="pt-monthly" className="font-normal cursor-pointer">Monthly</Label>
              </div>
            )}
            {admissionFeeTotal > 0 && monthlyFeeAmount > 0 && (
              <div className="flex items-center gap-2">
                <RadioGroupItem value="both" id="pt-both" />
                <Label htmlFor="pt-both" className="font-normal cursor-pointer">Both</Label>
              </div>
            )}
          </RadioGroup>
        </div>

        {/* Admission Amount */}
        {showAdmission && (
          <div className="space-y-2">
            <Label htmlFor="init-admission-amt">Admission Payment</Label>
            <Input
              id="init-admission-amt"
              type="number"
              step="0.01"
              min="0"
              max={admissionFeeTotal}
              value={value.admissionAmount || ""}
              onChange={(e) => onChange({ ...value, admissionAmount: Number(e.target.value) || 0 })}
              disabled={disabled}
              placeholder={`Max: ${admissionFeeTotal}`}
            />
          </div>
        )}

        {/* Monthly Months */}
        {showMonthly && availableMonths.length > 0 && (
          <div className="space-y-2">
            <Label>Select Months</Label>
            <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto rounded-md border p-2">
              {availableMonths.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={value.monthlyMonths.includes(m)}
                    onCheckedChange={() => toggleMonth(m)}
                    disabled={disabled}
                  />
                  <span>{formatMonth(m)}</span>
                </label>
              ))}
            </div>
            {value.monthlyMonths.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {value.monthlyMonths.length} month(s) × {formatCurrency(monthlyFeeAmount, currency)} = {formatCurrency(value.monthlyAmount, currency)}
              </p>
            )}
          </div>
        )}

        {/* Payment Method */}
        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select value={value.paymentMethod} onValueChange={(v) => onChange({ ...value, paymentMethod: v })} disabled={disabled}>
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

        {/* Receipt */}
        <div className="space-y-2">
          <Label htmlFor="init-receipt">Receipt Number</Label>
          <Input
            id="init-receipt"
            value={value.receiptNumber}
            onChange={(e) => onChange({ ...value, receiptNumber: e.target.value })}
            disabled={disabled}
            placeholder="Optional"
          />
        </div>

        {/* Live Payment Summary */}
        {(totalInitialPayment > 0 || isOpen) && (
          <div className="rounded-md border bg-muted/50 p-3 space-y-2 text-sm">
            <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Payment Summary</p>
            <Separator />
            {showAdmission && (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Admission Fee</span>
                  <span>{formatCurrency(admissionFeeTotal, currency)}</span>
                </div>
                <div className="flex justify-between text-primary">
                  <span>Initial Payment</span>
                  <span>-{formatCurrency(value.admissionAmount, currency)}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>Remaining</span>
                  <span>{formatCurrency(admissionRemaining, currency)}</span>
                </div>
              </div>
            )}
            {showAdmission && showMonthly && <Separator />}
            {showMonthly && (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Monthly ({value.monthlyMonths.length} months)</span>
                  <span>{formatCurrency(value.monthlyAmount, currency)}</span>
                </div>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total Payment</span>
              <span className="text-primary">{formatCurrency(totalInitialPayment, currency)}</span>
            </div>
            {totalPendingAfter > 0 && (
              <div className="flex justify-between font-medium text-destructive">
                <span>Total Pending</span>
                <span>{formatCurrency(totalPendingAfter, currency)}</span>
              </div>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
