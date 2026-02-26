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
import { TrendingUp, Landmark, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

type Step = "type" | "info" | "details";

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

  // Calculated values
  const autoOwnership = invAmount && valuation && parseFloat(valuation) > 0
    ? ((parseFloat(invAmount) / parseFloat(valuation)) * 100).toFixed(2)
    : null;

  const loanPrincipal = parseFloat(loanAmount) || 0;
  const loanRate = parseFloat(interestRate) || 0;
  const interestAmount = loanPrincipal * loanRate / 100; // simple interest for 1 year default
  const totalRepayable = loanPrincipal + interestAmount;

  const monthsBetween = (() => {
    if (!repStart || !repDue) return 0;
    const s = new Date(repStart); const d = new Date(repDue);
    return Math.max(1, (d.getFullYear() - s.getFullYear()) * 12 + d.getMonth() - s.getMonth());
  })();
  const monthlyInstallment = repType === "monthly" && monthsBetween > 0 ? totalRepayable / monthsBetween : 0;

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!type) return;
    setSaving(true);

    try {
      // Create stakeholder first, get ID
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

      // We need the ID, so use supabase directly
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: shRow, error: shErr } = await supabase
        .from("stakeholders")
        .insert({ ...shData, company_id: activeCompanyId, user_id: (await supabase.auth.getUser()).data.user!.id })
        .select("id")
        .single();
      if (shErr) throw shErr;

      const stakeholderId = (shRow as any).id;
      const userId = (await supabase.auth.getUser()).data.user!.id;

      if (type === "investor") {
        const amt = parseFloat(invAmount);
        if (!amt || amt <= 0) { toast.error("Investment amount must be greater than 0"); setSaving(false); return; }
        const ownPct = ownership ? parseFloat(ownership) : autoOwnership ? parseFloat(autoOwnership) : 0;
        const psPct = profitShare ? parseFloat(profitShare) : ownPct;

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
          },
        });
      } else {
        if (!loanPrincipal || loanPrincipal <= 0) { toast.error("Loan amount must be greater than 0"); setSaving(false); return; }
        if (!repDue) { toast.error("Repayment due date is required"); setSaving(false); return; }

        await saveLoan.mutateAsync({
          data: {
            stakeholder_id: stakeholderId,
            loan_amount: loanPrincipal,
            interest_rate: loanRate,
            interest_amount: interestAmount,
            total_repayable: totalRepayable,
            loan_date: loanDate,
            loan_purpose: loanPurpose || null,
            repayment_type: repType,
            repayment_start_date: repStart || null,
            repayment_due_date: repDue,
            monthly_installment: monthlyInstallment || null,
            collateral_description: collateral || null,
            remaining_balance: totalRepayable,
            notes: loanNotes || null,
            status: "active",
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/stakeholders")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold">Add Stakeholder</h1>
          <p className="text-sm text-muted-foreground">
            {step === "type" ? "Select type" : step === "info" ? "Basic information" : "Financial details"}
          </p>
        </div>
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

      {/* Step 3: Financial Details */}
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
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Investor"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Lender"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
