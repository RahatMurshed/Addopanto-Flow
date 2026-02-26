import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStakeholders, useInvestments, useLoans, useDeleteStakeholder } from "@/hooks/useStakeholders";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, TrendingUp, Landmark, Eye, Pencil, Trash2, Users } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Stakeholder } from "@/types/stakeholders";

function StakeholderStatusBadge({ status }: { status: string }) {
  const variant = status === "active" ? "default" : status === "exited" ? "secondary" : "outline";
  return <Badge variant={variant} className="capitalize">{status}</Badge>;
}

function TypeBadge({ type }: { type: string }) {
  return (
    <Badge className={type === "investor"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
      : "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30"
    }>
      {type === "investor" ? "Investor" : "Lender"}
    </Badge>
  );
}

function CategoryBadge({ category }: { category: string }) {
  return <Badge variant="outline" className="capitalize">{category}</Badge>;
}

export default function StakeholdersPage() {
  const navigate = useNavigate();
  const { fc } = useCompanyCurrency();
  const [tab, setTab] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const typeFilter = tab === "investors" ? "investor" as const : tab === "lenders" ? "lender" as const : undefined;
  const { data: stakeholders = [], isLoading } = useStakeholders(typeFilter);
  const { data: allInvestments = [] } = useInvestments();
  const { data: allLoans = [] } = useLoans();
  const deleteMutation = useDeleteStakeholder();

  // Summary calculations
  const investors = stakeholders.filter(s => s.stakeholder_type === "investor");
  const lenders = stakeholders.filter(s => s.stakeholder_type === "lender");
  const totalInvested = allInvestments.reduce((s, i) => s + i.investment_amount, 0);
  const totalOwnership = allInvestments.filter(i => i.status === "active").reduce((s, i) => s + i.ownership_percentage, 0);
  const totalLoaned = allLoans.reduce((s, l) => s + l.loan_amount, 0);
  const totalOwed = allLoans.filter(l => l.status !== "paid_off").reduce((s, l) => s + l.remaining_balance, 0);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success("Stakeholder deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
    setDeleteId(null);
  };

  const getInvestorSummary = (id: string) => {
    const inv = allInvestments.filter(i => i.stakeholder_id === id);
    return {
      totalInvested: inv.reduce((s, i) => s + i.investment_amount, 0),
      ownership: inv.filter(i => i.status === "active").reduce((s, i) => s + i.ownership_percentage, 0),
    };
  };

  const getLenderSummary = (id: string) => {
    const ln = allLoans.filter(l => l.stakeholder_id === id);
    const totalLent = ln.reduce((s, l) => s + l.loan_amount, 0);
    const totalRepayable = ln.reduce((s, l) => s + l.total_repayable, 0);
    const remaining = ln.filter(l => l.status !== "paid_off").reduce((s, l) => s + l.remaining_balance, 0);
    const pctRepaid = totalRepayable > 0 ? ((totalRepayable - remaining) / totalRepayable) * 100 : 0;
    return { totalLent, totalRepayable, remaining, pctRepaid };
  };

  const renderCard = (s: Stakeholder) => {
    const isInvestor = s.stakeholder_type === "investor";
    const summary = isInvestor ? getInvestorSummary(s.id) : getLenderSummary(s.id);

    return (
      <Card key={s.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-10 w-10 shrink-0">
                {s.image_url && <AvatarImage src={s.image_url} alt={s.name} className="object-cover" />}
                <AvatarFallback className={isInvestor ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-medium" : "bg-orange-500/15 text-orange-700 dark:text-orange-400 font-medium"}>
                  {s.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{s.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <TypeBadge type={s.stakeholder_type} />
                <CategoryBadge category={s.category} />
                <StakeholderStatusBadge status={s.status} />
                </div>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(`/stakeholders/${s.id}`)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(`/stakeholders/${s.id}?edit=true`)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(s.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            {isInvestor ? (
              <>
                <div>
                  <p className="text-muted-foreground text-xs">Total Invested</p>
                  <p className="font-semibold">{fc((summary as any).totalInvested)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Ownership</p>
                  <p className="font-semibold">{(summary as any).ownership.toFixed(1)}%</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-muted-foreground text-xs">Total Lent</p>
                  <p className="font-semibold">{fc((summary as any).totalLent)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Remaining</p>
                  <p className="font-semibold text-destructive">{fc((summary as any).remaining)}</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Investors & Loans</h1>
          <p className="text-muted-foreground text-sm">Manage equity investors and debt lenders</p>
        </div>
        <Button onClick={() => navigate("/stakeholders/new")} className="gap-2">
          <Plus className="h-4 w-4" /> Add Stakeholder
        </Button>
      </div>

      {/* Investment & Loan Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
              <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Investment</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{fc(totalInvested)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500/15">
              <Landmark className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Loan Amount</p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{fc(totalLoaned)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> Investors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{investors.length}</p>
            <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
              <p>Total received: <span className="font-medium text-foreground">{fc(totalInvested)}</span></p>
              <p>Ownership given: <span className="font-medium text-foreground">{totalOwnership.toFixed(1)}%</span></p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Landmark className="h-4 w-4 text-orange-500" /> Lenders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{lenders.length}</p>
            <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
              <p>Total loans: <span className="font-medium text-foreground">{fc(totalLoaned)}</span></p>
              <p>Still owed: <span className="font-medium text-destructive">{fc(totalOwed)}</span></p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Total Obligations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fc(totalInvested + totalOwed)}</p>
            <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
              <p>Equity: <span className="font-medium text-emerald-600 dark:text-emerald-400">{fc(totalInvested)}</span></p>
              <p>Debt: <span className="font-medium text-orange-600 dark:text-orange-400">{fc(totalOwed)}</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All Stakeholders</TabsTrigger>
          <TabsTrigger value="investors">Investors Only</TabsTrigger>
          <TabsTrigger value="lenders">Lenders Only</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : stakeholders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <h3 className="font-semibold text-lg">No stakeholders yet</h3>
                <p className="text-muted-foreground mt-1">Add your first investor or lender to start tracking.</p>
                <Button className="mt-4 gap-2" onClick={() => navigate("/stakeholders/new")}>
                  <Plus className="h-4 w-4" /> Add Stakeholder
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stakeholders.map(renderCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stakeholder?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this stakeholder and all associated investments, loans, and repayment records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
