import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStakeholder, useInvestments, useLoans, useProfitDistributions, useLoanRepayments, useSaveProfitDistribution, useSaveLoanRepayment } from "@/hooks/useStakeholders";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, TrendingUp, Landmark, Plus, Calendar, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function StakeholderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fc, symbol } = useCompanyCurrency();

  const { data: stakeholder, isLoading } = useStakeholder(id);
  const { data: investments = [] } = useInvestments(id);
  const { data: loans = [] } = useLoans(id);

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!stakeholder) return <div className="text-center py-12 text-muted-foreground">Stakeholder not found</div>;

  const isInvestor = stakeholder.stakeholder_type === "investor";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/stakeholders")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex items-center gap-4 flex-1">
          <div className={`h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold text-white ${isInvestor ? "bg-emerald-500" : "bg-orange-500"}`}>
            {stakeholder.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{stakeholder.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={isInvestor ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-orange-500/15 text-orange-700 dark:text-orange-400"}>
                {isInvestor ? "Investor" : "Lender"}
              </Badge>
              <Badge variant="outline" className="capitalize">{stakeholder.category}</Badge>
              <Badge variant={stakeholder.status === "active" ? "default" : "secondary"} className="capitalize">{stakeholder.status}</Badge>
              {stakeholder.contact_number && <span className="text-sm text-muted-foreground">📞 {stakeholder.contact_number}</span>}
              {stakeholder.email && <span className="text-sm text-muted-foreground">✉️ {stakeholder.email}</span>}
            </div>
          </div>
        </div>
      </div>

      {isInvestor ? (
        <InvestorDetails stakeholderId={id!} investments={investments} fc={fc} symbol={symbol} />
      ) : (
        <LenderDetails stakeholderId={id!} loans={loans} fc={fc} symbol={symbol} />
      )}
    </div>
  );
}

function InvestorDetails({ stakeholderId, investments, fc, symbol }: { stakeholderId: string; investments: any[]; fc: (n: number) => string; symbol: string }) {
  const [showDistribute, setShowDistribute] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<any>(null);
  const { data: allDistributions = [] } = useProfitDistributions();
  const saveDist = useSaveProfitDistribution();

  // Distribution form state
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [totalProfit, setTotalProfit] = useState("");
  const [amountToPay, setAmountToPay] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState("cash");
  const [payRef, setPayRef] = useState("");
  const [distStatus, setDistStatus] = useState("paid");
  const [distNotes, setDistNotes] = useState("");

  const calcAmount = selectedInvestment && totalProfit
    ? (parseFloat(totalProfit) * selectedInvestment.profit_share_percentage / 100)
    : 0;

  const handleDistribute = async () => {
    if (!selectedInvestment || !periodStart || !periodEnd || !totalProfit) {
      toast.error("Fill all required fields"); return;
    }
    try {
      await saveDist.mutateAsync({
        investment_id: selectedInvestment.id,
        distribution_date: paymentDate,
        profit_period_start: periodStart,
        profit_period_end: periodEnd,
        total_company_profit: parseFloat(totalProfit),
        investor_share_percentage: selectedInvestment.profit_share_percentage,
        calculated_amount: calcAmount,
        amount_paid: parseFloat(amountToPay) || calcAmount,
        payment_method: payMethod,
        payment_reference: payRef || null,
        status: distStatus,
        notes: distNotes || null,
      });
      toast.success("Profit distributed successfully");
      setShowDistribute(false);
      resetDistForm();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const resetDistForm = () => {
    setPeriodStart(""); setPeriodEnd(""); setTotalProfit(""); setAmountToPay("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPayMethod("cash"); setPayRef(""); setDistStatus("paid"); setDistNotes("");
  };

  const totalDistributed = allDistributions
    .filter(d => investments.some(i => i.id === d.investment_id))
    .reduce((s, d) => s + d.amount_paid, 0);

  return (
    <>
      {investments.map((inv, idx) => {
        const invDists = allDistributions.filter(d => d.investment_id === inv.id);
        const invDistTotal = invDists.reduce((s, d) => s + d.amount_paid, 0);
        const roi = inv.investment_amount > 0 ? (invDistTotal / inv.investment_amount * 100).toFixed(1) : "0";

        return (
          <Card key={inv.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Investment #{idx + 1} — {format(new Date(inv.investment_date), "dd MMM yyyy")}
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => { setSelectedInvestment(inv); setShowDistribute(true); }}>
                  <Plus className="h-3 w-3 mr-1" /> Distribute Profit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="text-muted-foreground">Amount</p><p className="font-semibold">{fc(inv.investment_amount)}</p></div>
                <div><p className="text-muted-foreground">Ownership</p><p className="font-semibold">{inv.ownership_percentage}%</p></div>
                <div><p className="text-muted-foreground">Profit Share</p><p className="font-semibold">{inv.profit_share_percentage}%</p></div>
                <div><p className="text-muted-foreground">ROI</p><p className="font-semibold text-emerald-600">{roi}%</p></div>
                <div><p className="text-muted-foreground">Type</p><p className="font-semibold capitalize">{inv.investment_type.replace("_", " ")}</p></div>
                <div><p className="text-muted-foreground">Status</p><Badge variant={inv.status === "active" ? "default" : "secondary"} className="capitalize">{inv.status}</Badge></div>
                <div><p className="text-muted-foreground">Total Distributed</p><p className="font-semibold">{fc(invDistTotal)}</p></div>
              </div>

              {invDists.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Distribution History</h4>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead className="text-right">Company Profit</TableHead>
                          <TableHead className="text-right">Amount Paid</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invDists.map(d => (
                          <TableRow key={d.id}>
                            <TableCell>{format(new Date(d.distribution_date), "dd/MM/yyyy")}</TableCell>
                            <TableCell className="text-xs">{format(new Date(d.profit_period_start), "MMM yy")} – {format(new Date(d.profit_period_end), "MMM yy")}</TableCell>
                            <TableCell className="text-right">{fc(d.total_company_profit)}</TableCell>
                            <TableCell className="text-right font-medium">{fc(d.amount_paid)}</TableCell>
                            <TableCell className="capitalize">{d.payment_method.replace("_", " ")}</TableCell>
                            <TableCell><Badge variant={d.status === "paid" ? "default" : "secondary"} className="capitalize">{d.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Distribute Profit Modal */}
      <Dialog open={showDistribute} onOpenChange={setShowDistribute}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Distribute Profit</DialogTitle>
          </DialogHeader>
          {selectedInvestment && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded text-sm space-y-1">
                <p>Profit Share: <strong>{selectedInvestment.profit_share_percentage}%</strong></p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Period Start <span className="text-destructive">*</span></Label><Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} /></div>
                <div><Label>Period End <span className="text-destructive">*</span></Label><Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} /></div>
              </div>
              <div>
                <Label>Total Company Profit ({symbol}) <span className="text-destructive">*</span></Label>
                <Input type="number" value={totalProfit} onChange={e => { setTotalProfit(e.target.value); setAmountToPay(""); }} />
              </div>
              {calcAmount > 0 && (
                <p className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded">
                  {selectedInvestment.profit_share_percentage}% × {symbol}{parseFloat(totalProfit).toLocaleString()} = <strong>{symbol}{calcAmount.toLocaleString()}</strong>
                </p>
              )}
              <div>
                <Label>Amount to Pay ({symbol})</Label>
                <Input type="number" value={amountToPay} onChange={e => setAmountToPay(e.target.value)} placeholder={calcAmount.toString()} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Payment Date <span className="text-destructive">*</span></Label><Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} /></div>
                <div>
                  <Label>Method</Label>
                  <Select value={payMethod} onValueChange={setPayMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Reference</Label><Input value={payRef} onChange={e => setPayRef(e.target.value)} /></div>
              <div><Label>Notes</Label><Textarea value={distNotes} onChange={e => setDistNotes(e.target.value)} rows={2} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDistribute(false)}>Cancel</Button>
            <Button onClick={handleDistribute} disabled={saveDist.isPending}>Save Distribution</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LenderDetails({ stakeholderId, loans, fc, symbol }: { stakeholderId: string; loans: any[]; fc: (n: number) => string; symbol: string }) {
  const [showRepayment, setShowRepayment] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const { data: allRepayments = [] } = useLoanRepayments();
  const saveRep = useSaveLoanRepayment();

  // Repayment form
  const [repDate, setRepDate] = useState(new Date().toISOString().slice(0, 10));
  const [repAmount, setRepAmount] = useState("");
  const [repMethod, setRepMethod] = useState("cash");
  const [repReceipt, setRepReceipt] = useState("");
  const [repNotes, setRepNotes] = useState("");

  const newBalance = selectedLoan ? selectedLoan.remaining_balance - (parseFloat(repAmount) || 0) : 0;

  const handleRepayment = async () => {
    if (!selectedLoan || !repAmount) { toast.error("Amount is required"); return; }
    const amt = parseFloat(repAmount);
    if (amt <= 0) { toast.error("Amount must be greater than 0"); return; }
    if (amt > selectedLoan.remaining_balance) { toast.error("Amount exceeds remaining balance"); return; }

    const dueDate = new Date(selectedLoan.repayment_due_date);
    const payDate = new Date(repDate);
    const daysOverdue = Math.max(0, Math.floor((payDate.getTime() - dueDate.getTime()) / 86400000));
    const payStatus = daysOverdue > 0 ? "late" : amt < (selectedLoan.monthly_installment || selectedLoan.remaining_balance) ? "partial" : "on_time";

    // Calculate principal/interest split proportionally
    const ratio = selectedLoan.loan_amount > 0 ? selectedLoan.loan_amount / selectedLoan.total_repayable : 1;
    const principalPortion = Math.round(amt * ratio * 100) / 100;
    const interestPortion = Math.round((amt - principalPortion) * 100) / 100;

    try {
      await saveRep.mutateAsync({
        loan_id: selectedLoan.id,
        repayment_date: repDate,
        amount_paid: amt,
        principal_portion: principalPortion,
        interest_portion: interestPortion,
        remaining_balance: Math.max(0, newBalance),
        payment_method: repMethod,
        receipt_number: repReceipt || null,
        payment_status: payStatus,
        days_overdue: daysOverdue,
        notes: repNotes || null,
      });
      toast.success(`Repayment recorded. New balance: ${symbol}${Math.max(0, newBalance).toLocaleString()}`);
      setShowRepayment(false);
      setRepAmount(""); setRepReceipt(""); setRepNotes("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <>
      {loans.map((loan, idx) => {
        const loanReps = allRepayments.filter(r => r.loan_id === loan.id);
        const totalPaid = loanReps.reduce((s, r) => s + r.amount_paid, 0);
        const pctPaid = loan.total_repayable > 0 ? (totalPaid / loan.total_repayable * 100) : 0;

        return (
          <Card key={loan.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-orange-500" />
                  Loan #{idx + 1} — {format(new Date(loan.loan_date), "dd MMM yyyy")}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant={loan.status === "active" ? "default" : loan.status === "paid_off" ? "secondary" : "destructive"} className="capitalize">
                    {loan.status.replace("_", " ")}
                  </Badge>
                  {loan.status !== "paid_off" && (
                    <Button size="sm" variant="outline" onClick={() => { setSelectedLoan(loan); setShowRepayment(true); }}>
                      <Plus className="h-3 w-3 mr-1" /> Record Payment
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="text-muted-foreground">Principal</p><p className="font-semibold">{fc(loan.loan_amount)}</p></div>
                <div><p className="text-muted-foreground">Interest ({loan.interest_rate}%)</p><p className="font-semibold">{fc(loan.interest_amount)}</p></div>
                <div><p className="text-muted-foreground">Total Repayable</p><p className="font-semibold">{fc(loan.total_repayable)}</p></div>
                <div><p className="text-muted-foreground">Remaining</p><p className="font-semibold text-destructive">{fc(loan.remaining_balance)}</p></div>
                <div><p className="text-muted-foreground">Repayment Type</p><p className="font-semibold capitalize">{loan.repayment_type.replace("_", " ")}</p></div>
                {loan.monthly_installment && <div><p className="text-muted-foreground">Monthly</p><p className="font-semibold">{fc(loan.monthly_installment)}</p></div>}
                <div><p className="text-muted-foreground">Due Date</p><p className="font-semibold">{format(new Date(loan.repayment_due_date), "dd/MM/yyyy")}</p></div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Paid: {fc(totalPaid)}</span>
                  <span>{pctPaid.toFixed(0)}%</span>
                </div>
                <Progress value={pctPaid} className="h-2" />
              </div>

              {loan.loan_purpose && <p className="mt-3 text-sm text-muted-foreground">Purpose: {loan.loan_purpose}</p>}
              {loan.collateral_description && <p className="text-sm text-muted-foreground">Collateral: {loan.collateral_description}</p>}

              {loanReps.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Repayment History</h4>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Principal</TableHead>
                          <TableHead className="text-right">Interest</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loanReps.map(r => (
                          <TableRow key={r.id}>
                            <TableCell>{format(new Date(r.repayment_date), "dd/MM/yyyy")}</TableCell>
                            <TableCell className="text-right font-medium">{fc(r.amount_paid)}</TableCell>
                            <TableCell className="text-right">{fc(r.principal_portion)}</TableCell>
                            <TableCell className="text-right">{fc(r.interest_portion)}</TableCell>
                            <TableCell className="text-right">{fc(r.remaining_balance)}</TableCell>
                            <TableCell className="capitalize">{r.payment_method.replace("_", " ")}</TableCell>
                            <TableCell>
                              <Badge variant={r.payment_status === "on_time" ? "default" : r.payment_status === "late" ? "destructive" : "secondary"} className="capitalize">
                                {r.payment_status.replace("_", " ")}
                                {r.days_overdue > 0 && ` (${r.days_overdue}d)`}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Record Repayment Modal */}
      <Dialog open={showRepayment} onOpenChange={setShowRepayment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Loan Repayment</DialogTitle>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded text-sm space-y-1">
                <p>Current Balance: <strong className="text-destructive">{symbol}{selectedLoan.remaining_balance.toLocaleString()}</strong></p>
                {selectedLoan.monthly_installment && <p>Monthly: <strong>{symbol}{selectedLoan.monthly_installment.toLocaleString()}</strong></p>}
              </div>
              <div>
                <Label>Payment Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={repDate} onChange={e => setRepDate(e.target.value)} />
              </div>
              <div>
                <Label>Amount ({symbol}) <span className="text-destructive">*</span></Label>
                <Input type="number" min={0} max={selectedLoan.remaining_balance} value={repAmount} onChange={e => setRepAmount(e.target.value)} />
              </div>
              {parseFloat(repAmount) > 0 && (
                <p className="text-sm bg-muted/50 p-2 rounded">
                  New balance: <strong>{symbol}{Math.max(0, newBalance).toLocaleString()}</strong>
                  {newBalance <= 0 && <span className="text-emerald-600 ml-2">✓ Fully paid off!</span>}
                </p>
              )}
              <div>
                <Label>Payment Method</Label>
                <Select value={repMethod} onValueChange={setRepMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Receipt / Reference</Label><Input value={repReceipt} onChange={e => setRepReceipt(e.target.value)} /></div>
              <div><Label>Notes</Label><Textarea value={repNotes} onChange={e => setRepNotes(e.target.value)} rows={2} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRepayment(false)}>Cancel</Button>
            <Button onClick={handleRepayment} disabled={saveRep.isPending}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
