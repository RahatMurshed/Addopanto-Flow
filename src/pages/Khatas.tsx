import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useExpenseAccounts,
  useCreateExpenseAccount,
  useUpdateExpenseAccount,
  useDeleteExpenseAccount,
  useCreateDefaultAccounts,
  type ExpenseAccount,
} from "@/hooks/useExpenseAccounts";
import { useAccountBalances } from "@/hooks/useExpenses";
import { useKhataTransfers, useCreateKhataTransfer, useDeleteKhataTransfer } from "@/hooks/useKhataTransfers";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, AlertTriangle, Loader2, Sparkles, ArrowLeftRight } from "lucide-react";
import { SkeletonKhataCards } from "@/components/shared/SkeletonLoaders";
import { Skeleton } from "@/components/ui/skeleton";
import KhataDialog from "@/components/dialogs/KhataDialog";
import TransferDialog from "@/components/dialogs/TransferDialog";
import TransferHistoryCard from "@/components/finance/TransferHistoryCard";

export default function Khatas() {
  const navigate = useNavigate();
  const { data: accounts = [], isLoading } = useExpenseAccounts();
  const { data: balances = [] } = useAccountBalances();
  const { fc: formatCurrency, currencyCode: currency } = useCompanyCurrency();

  // Balance lookup map
  const balanceMap = new Map(balances.map((b) => [b.id, b]));
  
  // Company-level permissions
  const { canAddExpenseSource, canEdit, canDelete, isModerator, canTransfer } = useCompany();
  
  const createMutation = useCreateExpenseAccount();
  const updateMutation = useUpdateExpenseAccount();
  const deleteMutation = useDeleteExpenseAccount();
  const createDefaultsMutation = useCreateDefaultAccounts();
  const { data: transfers = [] } = useKhataTransfers();
  const createTransferMutation = useCreateKhataTransfer();
  const deleteTransferMutation = useDeleteKhataTransfer();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [editingKhata, setEditingKhata] = useState<ExpenseAccount | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // DEO route guard: redirect if no expense source permissions
  useEffect(() => {
    if (isModerator && !canAddExpenseSource) {
      navigate("/dashboard", { replace: true });
    }
  }, [isModerator, canAddExpenseSource, navigate]);

  const totalPercentage = accounts
    .filter((a) => a.is_active)
    .reduce((sum, a) => sum + Number(a.allocation_percentage), 0);

  const handleCreate = async (data: Omit<ExpenseAccount, "id" | "user_id" | "created_at" | "updated_at">) => {
    try {
      await createMutation.mutateAsync(data);
      toast({ title: "Expense source created" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleUpdate = async (data: Omit<ExpenseAccount, "id" | "user_id" | "created_at" | "updated_at">) => {
    if (!editingKhata) return;
    try {
      await updateMutation.mutateAsync({ id: editingKhata.id, ...data });
      toast({ title: "Expense source updated" });
      setEditingKhata(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({ title: "Expense source deleted" });
      setDeleteId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleCreateDefaults = async () => {
    try {
      await createDefaultsMutation.mutateAsync();
      toast({ title: "Default expense sources created", description: "6 expense accounts added with suggested allocations" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleTransfer = async (data: { from_account_id: string; to_account_id: string; amount: number; description?: string }) => {
    try {
      await createTransferMutation.mutateAsync(data);
      toast({ title: "Transfer completed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleDeleteTransfer = async (id: string) => {
    try {
      await deleteTransferMutation.mutateAsync(id);
      toast({ title: "Transfer deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-44 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <SkeletonKhataCards count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Expense Sources</h1>
            {isModerator && <Badge className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0 text-xs">Moderator</Badge>}
          </div>
          <p className="text-muted-foreground">Manage your expense categories and allocation percentages</p>
        </div>
        <div className="flex gap-2">
          {accounts.length === 0 && canAddExpenseSource && (
            <Button
              variant="outline"
              onClick={handleCreateDefaults}
              disabled={createDefaultsMutation.isPending}
            >
              {createDefaultsMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Use Defaults
            </Button>
          )}
          {canTransfer && accounts.length > 1 && (
            <Button variant="outline" onClick={() => setTransferDialogOpen(true)}>
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Transfer
            </Button>
          )}
          {canAddExpenseSource && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense Source
            </Button>
          )}
        </div>
      </div>

      {totalPercentage > 100 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Total allocation is {totalPercentage.toFixed(1)}% — exceeds 100%! Adjust your percentages.
          </AlertDescription>
        </Alert>
      )}

      {totalPercentage < 100 && totalPercentage > 0 && (
        <Alert>
          <AlertDescription>
            Total allocation is {totalPercentage.toFixed(1)}% — {(100 - totalPercentage).toFixed(1)}% unallocated will go to profit.
          </AlertDescription>
        </Alert>
      )}

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No expense accounts yet</h3>
            <p className="mb-4 max-w-sm text-muted-foreground">
              Create expense sources to automatically allocate your revenue. Start with our defaults or create custom ones.
            </p>
            <div className="flex gap-2">
              {canAddExpenseSource && (
                <Button variant="outline" onClick={handleCreateDefaults} disabled={createDefaultsMutation.isPending}>
                  {createDefaultsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Use Defaults
                </Button>
              )}
              {canAddExpenseSource && (
                <Button onClick={() => setDialogOpen(true)}>Create Custom</Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const bal = balanceMap.get(account.id);
            const balance = bal?.balance ?? 0;
            const isDeficit = balance < 0;
            return (
            <Card key={account.id} className={`${!account.is_active ? "opacity-60" : ""} ${isDeficit && account.is_active ? "border-destructive/40" : ""}`}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: account.color }}
                  />
                  <CardTitle className="text-base font-semibold">{account.name}</CardTitle>
                </div>
                {(canEdit || canDelete) && (
                  <div className="flex gap-1">
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingKhata(account);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(account.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold">{account.allocation_percentage}%</p>
                    <p className="text-sm text-muted-foreground">allocation</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {!account.is_active && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                    {account.expected_monthly_expense && (
                      <p className="text-xs text-muted-foreground">
                        Expected: {formatCurrency(Number(account.expected_monthly_expense), currency)}
                      </p>
                    )}
                  </div>
                </div>
                {bal && (
                  <div className="mt-3 border-t pt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Allocated</span>
                      <span>{formatCurrency(bal.total_allocated, currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Spent</span>
                      <span>{formatCurrency(bal.total_spent, currency)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Balance</span>
                      <span className={isDeficit ? "text-destructive" : "text-green-600 dark:text-green-400"}>
                        {formatCurrency(balance, currency)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Summary Bar */}
      {accounts.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex h-4 overflow-hidden rounded-full bg-muted">
              {accounts
                .filter((a) => a.is_active && a.allocation_percentage > 0)
                .map((account) => (
                  <div
                    key={account.id}
                    className="h-full transition-all"
                    style={{
                      width: `${Math.min(account.allocation_percentage, 100)}%`,
                      backgroundColor: account.color,
                    }}
                    title={`${account.name}: ${account.allocation_percentage}%`}
                  />
                ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {accounts.filter((a) => a.is_active).map((account) => (
                <div key={account.id} className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: account.color }} />
                  <span className="text-muted-foreground">{account.name}</span>
                  <span className="font-medium">{account.allocation_percentage}%</span>
                </div>
              ))}
            </div>
            {balances.length > 0 && (() => {
              const totals = balances.reduce(
                (acc, b) => ({
                  allocated: acc.allocated + b.total_allocated,
                  spent: acc.spent + b.total_spent,
                  balance: acc.balance + b.balance,
                }),
                { allocated: 0, spent: 0, balance: 0 }
              );
              return (
                <div className="mt-3 border-t pt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <div><span className="text-muted-foreground">Total Allocated: </span><span className="font-medium">{formatCurrency(totals.allocated, currency)}</span></div>
                  <div><span className="text-muted-foreground">Total Spent: </span><span className="font-medium">{formatCurrency(totals.spent, currency)}</span></div>
                  <div><span className="text-muted-foreground">Net Balance: </span><span className={`font-semibold ${totals.balance < 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>{formatCurrency(totals.balance, currency)}</span></div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <KhataDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingKhata(null);
        }}
        khata={editingKhata}
        onSave={editingKhata ? handleUpdate : handleCreate}
      />

      {/* Transfer Dialog */}
      <TransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        accounts={balances}
        onTransfer={handleTransfer}
        isPending={createTransferMutation.isPending}
      />

      {/* Transfer History */}
      {transfers.length > 0 && (
        <TransferHistoryCard
          transfers={transfers}
          accounts={balances}
          onDelete={canDelete ? handleDeleteTransfer : undefined}
          isDeleting={deleteTransferMutation.isPending}
          showDelete={canDelete}
          showDateFilter
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setDeleteId(null); }}>
        <AlertDialogContent onEscapeKeyDown={(e) => { if (deleteMutation.isPending) e.preventDefault(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense source?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the expense account. Existing expenses and allocations linked to this account may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} disabled={deleteMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
