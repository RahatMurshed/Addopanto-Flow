import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSaveStakeholder, useSaveInvestment, useSaveLoan } from "@/hooks/useStakeholders";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { TrendingUp, Landmark, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SourceOfFundsStep from "@/components/stakeholders/SourceOfFundsStep";
import LoanDisbursementStep from "@/components/stakeholders/LoanDisbursementStep";

type Step = "type" | "info" | "details" | "source";

export default function AddStakeholderPage() {
  const navigate = useNavigate();
  const { activeCompanyId } = useCompany();
  const { symbol } = useCompanyCurrency();
  const saveSH = useSaveStakeholder();
  const saveInv = useSaveInvestment();
  const saveLoan = useSaveLoan();

  const [step, setStep] = useState<Step>("type");
  const [type, setType] = useState<"investor" | "lender" | null>(null);
  const [saving, setSaving] = useState(false);

  // Info fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState("individual");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Investment fields
  const [invAmount, setInvAmount] = useState("");
  const [invDate, setInvDate] = useState(new Date().toISOString().slice(0, 10));
  const [valuation, setValuation] = useState("");
  const [ownership, setOwnership] = useState("");
  const [profitShare, setProfitShare] = useState("");
  const [invType, setInvType] = useState("equity");
  const [terms, setTerms] = useState("");

  // Loan fields
  const [loanAmount, setLoanAmount] = useState("");
  const [interestRate, setInterestRate] = useState("0");
  const [loanDate, setLoanDate] = useState(new Date().toISOString().slice(0, 10));
  const [loanPurpose, setLoanPurpose] = useState("");
  const [repType, setRepType] = useState("flexible");
  const [repStart, setRepStart] = useState("");
  const [repDue, setRepDue] = useState("");
  const [collateral, setCollateral] = useState("");
  const [loanNotes, setLoanNotes] = useState("");

  // Source of Funds (Investment Step 4)
  const [receiptStatus, setReceiptStatus] = useState<"received" | "pending">("pending");
  const [transferMethod, setTransferMethod] = useState("");
  const [sourceBank, setSourceBank] = useState("");
  const [sourceAccountName, setSourceAccountName] = useState("");
  const [sourceAccountNumber, setSourceAccountNumber] = useState("");
  const [destinationBank, setDestinationBank] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  // Loan Disbursement (Lender Step 4)
  const [disbursementStatus, setDisbursementStatus] = useState<"disbursed" | "pending">("pending");
  const [disbursementMethod, setDisbursementMethod] = useState("");
  const [lSourceBank, setLSourceBank] = useState("");
  const [lSourceAccountName, setLSourceAccountName] = useState("");
  const [lDestinationBank, setLDestinationBank] = useState("");
  const [disbursementDate, setDisbursementDate] = useState("");
  const [lTransactionReference, setLTransactionReference] = useState("");
  const [loanAgreementNumber, setLoanAgreementNumber] = useState("");
  const [statedPurpose, setStatedPurpose] = useState("");
  const [disbursementNotes, setDisbursementNotes] = useState("");
  const [lProofFile, setLProofFile] = useState<File | null>(null);
  const [processingFee, setProcessingFee] = useState("");
  const [documentationCharges, setDocumentationCharges] = useState("");
  const [otherDeductions, setOtherDeductions] = useState("");

  // Calculated values
  const autoOwnership = invAmount && valuation && parseFloat(valuation) > 0
    ? ((parseFloat(invAmount) / parseFloat(valuation)) * 100).toFixed(2)
    : null;

  const loanPrincipal = parseFloat(loanAmount) || 0;
  const loanRate = parseFloat(interestRate) || 0;
  const interestAmount = loanPrincipal * loanRate / 100;
  const totalRepayable = loanPrincipal + interestAmount;

  const monthsBetween = (() => {
    if (!repStart || !repDue) return 0;
    const s = new Date(repStart); const d = new Date(repDue);
    return Math.max(1, (d.getFullYear() - s.getFullYear()) * 12 + d.getMonth() - s.getMonth());
  })();
  const monthlyInstallment = repType === "monthly" && monthsBetween > 0 ? totalRepayable / monthsBetween : 0;

  const maskAccount = (val: string) => val.length <= 4 ? val : "****" + val.slice(-4);

  const uploadProof = async (file: File, stakeholderId: string, prefix: string): Promise<string | null> => {
    if (!activeCompanyId) return null;
    const ext = file.name.split(".").pop();
    const path = `${activeCompanyId}/${stakeholderId}/${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("fund-documents").upload(path, file, { upsert: true });
    if (error) return null;
    const { data: pub } = supabase.storage.from("fund-documents").getPublicUrl(path);
    return pub.publicUrl;
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!type) return;
    setSaving(true);

    try {
      const shData = {
        name: name.trim(),
        stakeholder_type: type,
        category,
        contact_number: contactNumber || null,
        email: email || null,
        address: address || null,
        id_number: idNumber || null,
        relationship_notes: notes || null,
        status: "active",
      };

      const { data: shRow, error: shErr } = await supabase
        .from("stakeholders")
        .insert({ ...shData, company_id: activeCompanyId, user_id: (await supabase.auth.getUser()).data.user!.id } as any)
        .select("id")
        .single();
      if (shErr) throw shErr;

      const stakeholderId = (shRow as any).id;
      const userId = (await supabase.auth.getUser()).data.user!.id;

      // Upload stakeholder image
      if (imageFile && activeCompanyId) {
        const ext = imageFile.name.split(".").pop();
        const path = `${activeCompanyId}/${stakeholderId}.${ext}`;
        const { error: upErr } = await supabase.storage.from("stakeholder-images").upload(path, imageFile, { upsert: true });
        if (!upErr) {
          const { data: pub } = supabase.storage.from("stakeholder-images").getPublicUrl(path);
          await supabase.from("stakeholders").update({ image_url: pub.publicUrl } as any).eq("id", stakeholderId);
        }
      }

      if (type === "investor") {
        const amt = parseFloat(invAmount);
        if (!amt || amt <= 0) { toast.error("Investment amount must be greater than 0"); setSaving(false); return; }
        const ownPct = ownership ? parseFloat(ownership) : autoOwnership ? parseFloat(autoOwnership) : 0;
        const psPct = profitShare ? parseFloat(profitShare) : ownPct;

        // Upload proof document
        let proofUrl: string | null = null;
        if (proofFile) proofUrl = await uploadProof(proofFile, stakeholderId, "inv-proof");

        const rcvAmt = receiptStatus === "received" ? (parseFloat(receivedAmount) || amt) : 0;

        await saveInv.mutateAsync({
          data: {
            stakeholder_id: stakeholderId,
            investment_amount: amt,
            investment_date: invDate,
            ownership_percentage: ownPct,
            profit_share_percentage: psPct,
            investment_type: invType,
            company_valuation_at_investment: valuation ? parseFloat(valuation) : null,
            terms_and_conditions: terms || null,
            status: "active",
            // Source tracking
            transfer_method: receiptStatus === "received" ? transferMethod || null : null,
            source_bank: receiptStatus === "received" ? sourceBank || null : null,
            source_account_name: receiptStatus === "received" ? sourceAccountName || null : null,
            source_account_number_masked: receiptStatus === "received" && sourceAccountNumber ? maskAccount(sourceAccountNumber) : null,
            destination_bank: receiptStatus === "received" ? destinationBank || null : null,
            transfer_date: receiptStatus === "received" && transferDate ? transferDate : null,
            transaction_reference: receiptStatus === "received" ? transactionReference || null : null,
            proof_document_url: proofUrl,
            expected_amount: amt,
            received_amount: rcvAmt,
            receipt_status: receiptStatus === "received" ? (rcvAmt >= amt ? "received" : "partial") : "pending",
            allocated_to_expenses: 0,
            remaining_unallocated: rcvAmt,
            receipt_notes: receiptNotes || null,
          },
        });
      } else {
        if (!loanPrincipal || loanPrincipal <= 0) { toast.error("Loan amount must be greater than 0"); setSaving(false); return; }
        if (!repDue) { toast.error("Repayment due date is required"); setSaving(false); return; }

        let proofUrl: string | null = null;
        if (lProofFile) proofUrl = await uploadProof(lProofFile, stakeholderId, "loan-proof");

        const pFee = parseFloat(processingFee) || 0;
        const dCharges = parseFloat(documentationCharges) || 0;
        const oDed = parseFloat(otherDeductions) || 0;
        const netAmount = loanPrincipal - pFee - dCharges - oDed;

        await saveLoan.mutateAsync({
          data: {
            stakeholder_id: stakeholderId,
            loan_amount: loanPrincipal,
            interest_rate: loanRate,
            interest_amount: interestAmount,
            total_repayable: totalRepayable,
            loan_date: loanDate,
            loan_purpose: loanPurpose || statedPurpose || null,
            repayment_type: repType,
            repayment_start_date: repStart || null,
            repayment_due_date: repDue,
            monthly_installment: monthlyInstallment || null,
            collateral_description: collateral || null,
            remaining_balance: totalRepayable,
            notes: loanNotes || null,
            status: "active",
            // Disbursement tracking
            disbursement_method: disbursementStatus === "disbursed" ? disbursementMethod || null : null,
            disbursement_date: disbursementStatus === "disbursed" && disbursementDate ? disbursementDate : null,
            source_bank: disbursementStatus === "disbursed" ? lSourceBank || null : null,
            source_account_name: disbursementStatus === "disbursed" ? lSourceAccountName || null : null,
            destination_bank: disbursementStatus === "disbursed" ? lDestinationBank || null : null,
            transaction_reference: disbursementStatus === "disbursed" ? lTransactionReference || null : null,
            loan_agreement_number: loanAgreementNumber || null,
            disbursement_proof_url: proofUrl,
            gross_loan_amount: loanPrincipal,
            processing_fee: pFee,
            documentation_charges: dCharges,
            other_deductions: oDed,
            net_disbursed_amount: netAmount,
            disbursement_status: disbursementStatus === "disbursed" ? "disbursed" : "pending",
            allocated_to_expenses: 0,
            remaining_unallocated: disbursementStatus === "disbursed" ? netAmount : 0,
            stated_purpose: statedPurpose || loanPurpose || null,
            purpose_compliant: true,
            disbursement_notes: disbursementNotes || null,
          },
        });
      }

      toast.success(`${type === "investor" ? "Investor" : "Lender"} added successfully`);
      navigate("/stakeholders");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const stepLabel = step === "type" ? "Select type" : step === "info" ? "Basic information" : step === "details" ? "Financial details" : type === "investor" ? "Source of funds" : "Disbursement details";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/stakeholders")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold">Add Stakeholder</h1>
          <p className="text-sm text-muted-foreground">{stepLabel}</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {["type", "info", "details", "source"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${step === s ? "bg-primary" : ["type", "info", "details", "source"].indexOf(step) > i ? "bg-primary/50" : "bg-muted"}`} />
            {i < 3 && <div className={`h-px w-6 ${["type", "info", "details", "source"].indexOf(step) > i ? "bg-primary/50" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Type Selection */}
      {step === "type" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${type === "investor" ? "ring-2 ring-emerald-500" : ""}`}
            onClick={() => { setType("investor"); setStep("info"); }}
          >
            <CardContent className="flex flex-col items-center py-8 text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <TrendingUp className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="font-bold text-lg">Investor</h3>
              <p className="text-sm text-muted-foreground mt-1">Equity partner with profit sharing</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${type === "lender" ? "ring-2 ring-orange-500" : ""}`}
            onClick={() => { setType("lender"); setStep("info"); }}
          >
            <CardContent className="flex flex-col items-center py-8 text-center">
              <div className="h-16 w-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
                <Landmark className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="font-bold text-lg">Lender</h3>
              <p className="text-sm text-muted-foreground mt-1">Debt provider with loan repayment</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Common Info */}
      {step === "info" && (
        <Card>
          <CardHeader>
            <CardTitle>Stakeholder Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUpload
              value={null}
              onChange={() => {}}
              onFileSelect={(f) => setImageFile(f)}
              label="Upload Photo"
              variant="avatar"
              fallbackText={name}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Full Name <span className="text-destructive">*</span></Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Enter full name" />
              </div>
              <div>
                <Label>Category <span className="text-destructive">*</span></Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="organization">Organization</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="partner">Business Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contact Number</Label>
                <Input value={contactNumber} onChange={e => setContactNumber(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>ID / Registration Number</Label>
                <Input value={idNumber} onChange={e => setIdNumber(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Relationship Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep("type")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={() => { if (!name.trim()) { toast.error("Name is required"); return; } setStep("details"); }}>
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Investment Details */}
      {step === "details" && type === "investor" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-5 w-5" /> Investment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Investment Amount ({symbol}) <span className="text-destructive">*</span></Label>
                <Input type="number" min={0} value={invAmount} onChange={e => setInvAmount(e.target.value)} />
              </div>
              <div>
                <Label>Investment Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={invDate} onChange={e => setInvDate(e.target.value)} />
              </div>
              <div>
                <Label>Company Valuation ({symbol})</Label>
                <Input type="number" min={0} value={valuation} onChange={e => setValuation(e.target.value)} placeholder="For auto-calculating ownership" />
              </div>
              <div>
                <Label>Ownership % {autoOwnership ? `(auto: ${autoOwnership}%)` : ""}</Label>
                <Input type="number" min={0} max={100} step="0.01" value={ownership} onChange={e => setOwnership(e.target.value)} placeholder={autoOwnership || "0"} />
              </div>
              <div>
                <Label>Profit Share %</Label>
                <Input type="number" min={0} max={100} step="0.01" value={profitShare} onChange={e => setProfitShare(e.target.value)} placeholder="Defaults to ownership %" />
              </div>
              <div>
                <Label>Investment Type <span className="text-destructive">*</span></Label>
                <Select value={invType} onValueChange={setInvType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="profit_sharing">Profit Sharing</SelectItem>
                    <SelectItem value="convertible">Convertible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {autoOwnership && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-md">
                💡 Based on {symbol}{parseFloat(invAmount).toLocaleString()} investment at {symbol}{parseFloat(valuation).toLocaleString()} valuation, ownership = <strong>{autoOwnership}%</strong>
              </p>
            )}
            <div>
              <Label>Terms & Conditions</Label>
              <Textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3} placeholder="Special agreements..." />
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep("info")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={() => {
                const amt = parseFloat(invAmount);
                if (!amt || amt <= 0) { toast.error("Investment amount is required"); return; }
                setReceivedAmount(invAmount);
                setStep("source");
              }}>
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Loan Details */}
      {step === "details" && type === "lender" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <Landmark className="h-5 w-5" /> Loan Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Loan Amount / Principal ({symbol}) <span className="text-destructive">*</span></Label>
                <Input type="number" min={0} value={loanAmount} onChange={e => setLoanAmount(e.target.value)} />
              </div>
              <div>
                <Label>Interest Rate (%)</Label>
                <Input type="number" min={0} step="0.1" value={interestRate} onChange={e => setInterestRate(e.target.value)} />
              </div>
              <div>
                <Label>Loan Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={loanDate} onChange={e => setLoanDate(e.target.value)} />
              </div>
              <div>
                <Label>Repayment Type <span className="text-destructive">*</span></Label>
                <Select value={repType} onValueChange={setRepType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One-time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {repType === "monthly" && (
                <div>
                  <Label>Repayment Start Date</Label>
                  <Input type="date" value={repStart} onChange={e => setRepStart(e.target.value)} />
                </div>
              )}
              <div>
                <Label>Repayment Due Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={repDue} onChange={e => setRepDue(e.target.value)} />
              </div>
            </div>
            {loanPrincipal > 0 && (
              <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-md text-sm space-y-1">
                <p>Interest: <strong>{symbol}{interestAmount.toLocaleString()}</strong></p>
                <p>Total Repayable: <strong>{symbol}{totalRepayable.toLocaleString()}</strong></p>
                {repType === "monthly" && monthsBetween > 0 && (
                  <p>Monthly Installment: <strong>{symbol}{monthlyInstallment.toFixed(2)}</strong> ({monthsBetween} months)</p>
                )}
              </div>
            )}
            <div>
              <Label>Loan Purpose</Label>
              <Textarea value={loanPurpose} onChange={e => setLoanPurpose(e.target.value)} rows={2} placeholder="Business expansion, equipment purchase..." />
            </div>
            <div>
              <Label>Collateral Description</Label>
              <Textarea value={collateral} onChange={e => setCollateral(e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={loanNotes} onChange={e => setLoanNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep("info")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={() => {
                if (!loanPrincipal || loanPrincipal <= 0) { toast.error("Loan amount is required"); return; }
                if (!repDue) { toast.error("Due date is required"); return; }
                setStatedPurpose(loanPurpose);
                setStep("source");
              }}>
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Source of Funds (Investor) */}
      {step === "source" && type === "investor" && (
        <SourceOfFundsStep
          symbol={symbol}
          investmentAmount={parseFloat(invAmount) || 0}
          receiptStatus={receiptStatus}
          onReceiptStatusChange={setReceiptStatus}
          transferMethod={transferMethod}
          onTransferMethodChange={setTransferMethod}
          sourceBank={sourceBank}
          onSourceBankChange={setSourceBank}
          sourceAccountName={sourceAccountName}
          onSourceAccountNameChange={setSourceAccountName}
          sourceAccountNumber={sourceAccountNumber}
          onSourceAccountNumberChange={setSourceAccountNumber}
          destinationBank={destinationBank}
          onDestinationBankChange={setDestinationBank}
          transferDate={transferDate}
          onTransferDateChange={setTransferDate}
          transactionReference={transactionReference}
          onTransactionReferenceChange={setTransactionReference}
          receivedAmount={receivedAmount}
          onReceivedAmountChange={setReceivedAmount}
          receiptNotes={receiptNotes}
          onReceiptNotesChange={setReceiptNotes}
          proofFile={proofFile}
          onProofFileChange={setProofFile}
          onBack={() => setStep("details")}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {/* Step 4: Loan Disbursement (Lender) */}
      {step === "source" && type === "lender" && (
        <LoanDisbursementStep
          symbol={symbol}
          loanAmount={loanPrincipal}
          totalRepayable={totalRepayable}
          processingFee={processingFee}
          onProcessingFeeChange={setProcessingFee}
          documentationCharges={documentationCharges}
          onDocumentationChargesChange={setDocumentationCharges}
          otherDeductions={otherDeductions}
          onOtherDeductionsChange={setOtherDeductions}
          disbursementStatus={disbursementStatus}
          onDisbursementStatusChange={setDisbursementStatus}
          disbursementMethod={disbursementMethod}
          onDisbursementMethodChange={setDisbursementMethod}
          sourceBank={lSourceBank}
          onSourceBankChange={setLSourceBank}
          sourceAccountName={lSourceAccountName}
          onSourceAccountNameChange={setLSourceAccountName}
          destinationBank={lDestinationBank}
          onDestinationBankChange={setLDestinationBank}
          disbursementDate={disbursementDate}
          onDisbursementDateChange={setDisbursementDate}
          transactionReference={lTransactionReference}
          onTransactionReferenceChange={setLTransactionReference}
          loanAgreementNumber={loanAgreementNumber}
          onLoanAgreementNumberChange={setLoanAgreementNumber}
          statedPurpose={statedPurpose}
          onStatedPurposeChange={setStatedPurpose}
          disbursementNotes={disbursementNotes}
          onDisbursementNotesChange={setDisbursementNotes}
          proofFile={lProofFile}
          onProofFileChange={setLProofFile}
          onBack={() => setStep("details")}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}
