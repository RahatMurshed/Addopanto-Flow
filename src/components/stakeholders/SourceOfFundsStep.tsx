import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Check, Clock, Building2 } from "lucide-react";
import { TRANSFER_METHODS, type TransferMethod } from "@/types/stakeholders";

interface SourceOfFundsStepProps {
  symbol: string;
  investmentAmount: number;
  // Receipt status
  receiptStatus: "received" | "pending";
  onReceiptStatusChange: (v: "received" | "pending") => void;
  // Transfer details
  transferMethod: string;
  onTransferMethodChange: (v: string) => void;
  sourceBank: string;
  onSourceBankChange: (v: string) => void;
  sourceAccountName: string;
  onSourceAccountNameChange: (v: string) => void;
  sourceAccountNumber: string;
  onSourceAccountNumberChange: (v: string) => void;
  destinationBank: string;
  onDestinationBankChange: (v: string) => void;
  transferDate: string;
  onTransferDateChange: (v: string) => void;
  transactionReference: string;
  onTransactionReferenceChange: (v: string) => void;
  receivedAmount: string;
  onReceivedAmountChange: (v: string) => void;
  receiptNotes: string;
  onReceiptNotesChange: (v: string) => void;
  // Proof upload
  proofFile: File | null;
  onProofFileChange: (f: File | null) => void;
  // Navigation
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
}

export default function SourceOfFundsStep(props: SourceOfFundsStepProps) {
  const {
    symbol, investmentAmount, receiptStatus, onReceiptStatusChange,
    transferMethod, onTransferMethodChange, sourceBank, onSourceBankChange,
    sourceAccountName, onSourceAccountNameChange, sourceAccountNumber, onSourceAccountNumberChange,
    destinationBank, onDestinationBankChange, transferDate, onTransferDateChange,
    transactionReference, onTransactionReferenceChange, receivedAmount, onReceivedAmountChange,
    receiptNotes, onReceiptNotesChange, proofFile, onProofFileChange,
    onBack, onSave, saving,
  } = props;

  const maskedAccount = (val: string) => {
    if (val.length <= 4) return val;
    return "****" + val.slice(-4);
  };

  const rcvAmt = parseFloat(receivedAmount) || 0;
  const isFullyReceived = rcvAmt >= investmentAmount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <Building2 className="h-5 w-5" /> Source of Funds
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Receipt Status Toggle */}
        <div className="space-y-2">
          <Label>Receipt Status</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={receiptStatus === "received" ? "default" : "outline"}
              size="sm"
              onClick={() => onReceiptStatusChange("received")}
              className="gap-1"
            >
              <Check className="h-3 w-3" /> Funds Received
            </Button>
            <Button
              type="button"
              variant={receiptStatus === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => onReceiptStatusChange("pending")}
              className="gap-1"
            >
              <Clock className="h-3 w-3" /> Awaiting Receipt
            </Button>
          </div>
        </div>

        {receiptStatus === "received" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Transfer Method <span className="text-destructive">*</span></Label>
                <Select value={transferMethod} onValueChange={onTransferMethodChange}>
                  <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    {TRANSFER_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Transfer Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={transferDate} onChange={(e) => onTransferDateChange(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
              </div>
            </div>

            {(transferMethod === "bank_transfer" || transferMethod === "wire_transfer" || transferMethod === "upi") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Source Bank <span className="text-destructive">*</span></Label>
                  <Input value={sourceBank} onChange={(e) => onSourceBankChange(e.target.value)} placeholder="Bank name" />
                </div>
                <div>
                  <Label>Account Holder Name <span className="text-destructive">*</span></Label>
                  <Input value={sourceAccountName} onChange={(e) => onSourceAccountNameChange(e.target.value)} />
                </div>
                <div>
                  <Label>Source Account Number</Label>
                  <Input value={sourceAccountNumber} onChange={(e) => onSourceAccountNumberChange(e.target.value)} placeholder="Will be stored masked" />
                  {sourceAccountNumber && (
                    <p className="text-xs text-muted-foreground mt-1">Stored as: {maskedAccount(sourceAccountNumber)}</p>
                  )}
                </div>
                <div>
                  <Label>Destination Bank (Company)</Label>
                  <Input value={destinationBank} onChange={(e) => onDestinationBankChange(e.target.value)} placeholder="Company receiving bank" />
                </div>
              </div>
            )}

            {transferMethod === "cheque" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Cheque Number <span className="text-destructive">*</span></Label>
                  <Input value={transactionReference} onChange={(e) => onTransactionReferenceChange(e.target.value)} placeholder="Cheque number" />
                </div>
                <div>
                  <Label>Bank Name <span className="text-destructive">*</span></Label>
                  <Input value={sourceBank} onChange={(e) => onSourceBankChange(e.target.value)} />
                </div>
                <div>
                  <Label>Account Holder</Label>
                  <Input value={sourceAccountName} onChange={(e) => onSourceAccountNameChange(e.target.value)} />
                </div>
                <div>
                  <Label>Deposited To (Company Bank)</Label>
                  <Input value={destinationBank} onChange={(e) => onDestinationBankChange(e.target.value)} />
                </div>
              </div>
            )}

            {transferMethod === "cash" && (
              <div className="space-y-3">
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 rounded-md text-sm text-amber-800 dark:text-amber-300">
                  ⚠️ Cash transactions require extra documentation
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Deposited To (Company Bank) <span className="text-destructive">*</span></Label>
                    <Input value={destinationBank} onChange={(e) => onDestinationBankChange(e.target.value)} />
                  </div>
                  <div>
                    <Label>Bank Deposit Reference</Label>
                    <Input value={transactionReference} onChange={(e) => onTransactionReferenceChange(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {transferMethod && transferMethod !== "cheque" && transferMethod !== "cash" && (
              <div>
                <Label>Transaction Reference (UTR)</Label>
                <Input value={transactionReference} onChange={(e) => onTransactionReferenceChange(e.target.value)} placeholder="UTR / Transaction ID" />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Amount Received ({symbol})</Label>
                <Input type="number" min={0} value={receivedAmount} onChange={(e) => onReceivedAmountChange(e.target.value)} placeholder={investmentAmount.toString()} />
              </div>
              <div>
                <Label>Proof Document</Label>
                <div className="relative">
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => onProofFileChange(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                </div>
                {proofFile && <p className="text-xs text-muted-foreground mt-1">📎 {proofFile.name}</p>}
              </div>
            </div>

            {/* Receipt Summary */}
            <div className="bg-muted/50 border rounded-lg p-4 space-y-1 text-sm">
              <p className="font-medium mb-2">Receipt Summary</p>
              <div className="flex justify-between"><span className="text-muted-foreground">Investment Amount:</span><span className="font-medium">{symbol}{investmentAmount.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount Received:</span><span className="font-medium">{symbol}{rcvAmt.toLocaleString()}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={isFullyReceived ? "default" : "secondary"} className="text-xs">
                  {isFullyReceived ? "✓ Fully Received" : "Partial"}
                </Badge>
              </div>
              {transferMethod && <div className="flex justify-between"><span className="text-muted-foreground">Method:</span><span>{TRANSFER_METHODS.find(m => m.value === transferMethod)?.label}</span></div>}
              {transferDate && <div className="flex justify-between"><span className="text-muted-foreground">Date:</span><span>{transferDate}</span></div>}
              {transactionReference && <div className="flex justify-between"><span className="text-muted-foreground">Reference:</span><span>{transactionReference}</span></div>}
            </div>
          </>
        )}

        <div>
          <Label>Receipt Notes</Label>
          <Textarea value={receiptNotes} onChange={(e) => onReceiptNotesChange(e.target.value)} rows={2} placeholder="Additional information about this fund receipt" />
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save Investor"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
