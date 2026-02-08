import { useState, useEffect } from "react";
import {
  useExpenseAccounts,
  useCreateExpenseAccount,
  useUpdateExpenseAccount,
  useDeleteExpenseAccount,
  useCreateDefaultAccounts,
  type ExpenseAccount,
} from "@/hooks/useExpenseAccounts";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRole } from "@/contexts/RoleContext";
import { formatCurrency } from "@/utils/currencyUtils";
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
import { Plus, Pencil, Trash2, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import KhataDialog from "@/components/KhataDialog";

export default function Khatas() {
  const { data: accounts = [], isLoading } = useExpenseAccounts();
  const { data: userProfile } = useUserProfile();
  const currency = userProfile?.currency || "BDT";
  
  // Role-based permissions
  const { canAddExpenseSource, canEdit, canDelete } = useRole();
  
  const createMutation = useCreateExpenseAccount();
  const updateMutation = useUpdateExpenseAccount();
  const deleteMutation = useDeleteExpenseAccount();
  const createDefaultsMutation = useCreateDefaultAccounts();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKhata, setEditingKhata] = useState<ExpenseAccount | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expense Sources</h1>
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
          {accounts.map((account) => (
            <Card key={account.id} className={!account.is_active ? "opacity-60" : ""}>
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
              </CardContent>
            </Card>
          ))}
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense source?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the expense account. Existing expenses and allocations linked to this account may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
