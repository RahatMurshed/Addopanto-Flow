import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Clock, Landmark } from "lucide-react";
import { TRANSFER_METHODS } from "@/types/stakeholders";

interface LoanDisbursementStepProps {
  symbol: string;
  loanAmount: number;
  totalRepayable: number;
  // Deductions
  processingFee: string;
  onProcessingFeeChange: (v: string) => void;
  documentationCharges: string;
  onDocumentationChargesChange: (v: string) => void;
  otherDeductions: string;
  onOtherDeductionsChange: (v: string) => void;
  // Disbursement status
  disbursementStatus: "disbursed" | "pending";
  onDisbursementStatusChange: (v: "disbursed" | "pending") => void;
  // Transfer details
  disbursementMethod: string;
  onDisbursementMethodChange: (v: string) => void;
  sourceBank: string;
  onSourceBankChange: (v: string) => void;
  sourceAccountName: string;
  onSourceAccountNameChange: (v: string) => void;
  destinationBank: string;
  onDestinationBankChange: (v: string) => void;
  disbursementDate: string;
  onDisbursementDateChange: (v: string) => void;
  transactionReference: string;
  onTransactionReferenceChange: (v: string) => void;
  loanAgreementNumber: string;
  onLoanAgreementNumberChange: (v: string) => void;
  statedPurpose: string;
  onStatedPurposeChange: (v: string) => void;
  disbursementNotes: string;
  onDisbursementNotesChange: (v: string) => void;
  proofFile: File | null;
  onProofFileChange: (f: File | null) => void;
  // Navigation
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
}

export default function LoanDisbursementStep(props: LoanDisbursementStepProps) {
  const {
    symbol, loanAmount, totalRepayable,
    processingFee, onProcessingFeeChange,
    documentationCharges, onDocumentationChargesChange,
    otherDeductions, onOtherDeductionsChange,
    disbursementStatus, onDisbursementStatusChange,
    disbursementMethod, onDisbursementMethodChange,
    sourceBank, onSourceBankChange,
    sourceAccountName, onSourceAccountNameChange,
    destinationBank, onDestinationBankChange,
    disbursementDate, onDisbursementDateChange,
    transactionReference, onTransactionReferenceChange,
    loanAgreementNumber, onLoanAgreementNumberChange,
    statedPurpose, onStatedPurposeChange,
    disbursementNotes, onDisbursementNotesChange,
    proofFile, onProofFileChange,
    onBack, onSave, saving,
  } = props;

  const pFee = parseFloat(processingFee) || 0;
  const dCharges = parseFloat(documentationCharges) || 0;
  const oDed = parseFloat(otherDeductions) || 0;
  const totalDeductions = pFee + dCharges + oDed;
  const netAmount = loanAmount - totalDeductions;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
          <Landmark className="h-5 w-5" /> Loan Disbursement Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Deductions */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Deductions (if any)</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Processing Fee ({symbol})</Label>
              <Input type="number" min={0} value={processingFee} onChange={(e) => onProcessingFeeChange(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs">Documentation ({symbol})</Label>
              <Input type="number" min={0} value={documentationCharges} onChange={(e) => onDocumentationChargesChange(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs">Other Deductions ({symbol})</Label>
              <Input type="number" min={0} value={otherDeductions} onChange={(e) => onOtherDeductionsChange(e.target.value)} placeholder="0" />
            </div>
          </div>
          {totalDeductions > 0 && (
            <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-md text-sm space-y-1">
              <p>Loan Amount: <strong>{symbol}{loanAmount.toLocaleString()}</strong></p>
              <p>Total Deductions: <strong className="text-destructive">-{symbol}{totalDeductions.toLocaleString()}</strong></p>
              <p>Net to Receive: <strong className="text-emerald-600">{symbol}{netAmount.toLocaleString()}</strong></p>
            </div>
          )}
        </div>

        {/* Stated Purpose */}
        <div>
          <Label>Stated Purpose <span className="text-destructive">*</span></Label>
          <Textarea value={statedPurpose} onChange={(e) => onStatedPurposeChange(e.target.value)} rows={2} placeholder="What will this loan be used for? (Equipment, Expansion, Working Capital...)" />
          <p className="text-xs text-muted-foreground mt-1">This will be used to track if expenses match the loan purpose.</p>
        </div>

        {/* Disbursement Status */}
        <div className="space-y-2">
          <Label>Disbursement Status</Label>
          <div className="flex gap-2">
            <Button type="button" variant={disbursementStatus === "disbursed" ? "default" : "outline"} size="sm" onClick={() => onDisbursementStatusChange("disbursed")} className="gap-1">
              <Check className="h-3 w-3" /> Funds Disbursed
            </Button>
            <Button type="button" variant={disbursementStatus === "pending" ? "default" : "outline"} size="sm" onClick={() => onDisbursementStatusChange("pending")} className="gap-1">
              <Clock className="h-3 w-3" /> Awaiting Disbursement
            </Button>
          </div>
        </div>

        {disbursementStatus === "disbursed" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Disbursement Method <span className="text-destructive">*</span></Label>
                <Select value={disbursementMethod} onValueChange={onDisbursementMethodChange}>
                  <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    {TRANSFER_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Disbursement Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={disbursementDate} onChange={(e) => onDisbursementDateChange(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
              </div>
              <div>
                <Label>Lender's Bank</Label>
                <Input value={sourceBank} onChange={(e) => onSourceBankChange(e.target.value)} />
              </div>
              <div>
                <Label>Account Holder</Label>
                <Input value={sourceAccountName} onChange={(e) => onSourceAccountNameChange(e.target.value)} />
              </div>
              <div>
                <Label>Company Receiving Bank</Label>
                <Input value={destinationBank} onChange={(e) => onDestinationBankChange(e.target.value)} />
              </div>
              <div>
                <Label>Transaction Reference</Label>
                <Input value={transactionReference} onChange={(e) => onTransactionReferenceChange(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Loan Agreement Number</Label>
              <Input value={loanAgreementNumber} onChange={(e) => onLoanAgreementNumberChange(e.target.value)} />
            </div>

            <div>
              <Label>Proof Document</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => onProofFileChange(e.target.files?.[0] || null)} />
              {proofFile && <p className="text-xs text-muted-foreground mt-1">📎 {proofFile.name}</p>}
            </div>

            {/* Disbursement Summary */}
            <div className="bg-muted/50 border rounded-lg p-4 space-y-1 text-sm">
              <p className="font-medium mb-2">Disbursement Summary</p>
              <div className="flex justify-between"><span className="text-muted-foreground">Loan Approved:</span><span>{symbol}{loanAmount.toLocaleString()}</span></div>
              {totalDeductions > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Deductions:</span><span className="text-destructive">-{symbol}{totalDeductions.toLocaleString()}</span></div>}
              <div className="flex justify-between font-medium"><span className="text-muted-foreground">Net Disbursed:</span><span>{symbol}{netAmount.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">To Repay:</span><span>{symbol}{totalRepayable.toLocaleString()}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="default" className="text-xs">✓ Disbursed</Badge>
              </div>
            </div>
          </>
        )}

        <div>
          <Label>Disbursement Notes</Label>
          <Textarea value={disbursementNotes} onChange={(e) => onDisbursementNotesChange(e.target.value)} rows={2} />
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save Lender"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
