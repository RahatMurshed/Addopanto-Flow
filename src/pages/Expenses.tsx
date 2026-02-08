import { useState } from "react";
import { format } from "date-fns";
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useAccountBalances,
  useExpenseSummary,
  type ExpenseWithAccount,
} from "@/hooks/useExpenses";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Receipt,
  Calendar,
  Loader2,
  AlertTriangle,
  TrendingDown,
} from "lucide-react";
import ExpenseDialog from "@/components/ExpenseDialog";

export default function Expenses() {
  const { data: expenses = [], isLoading } = useExpenses();
  const { data: accounts = [] } = useAccountBalances();
  const { data: summary } = useExpenseSummary();
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithAccount | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const accountsWithDeficit = accounts.filter((a) => a.balance < 0);
  const accountsNearLimit = accounts.filter(
    (a) => a.expected_monthly_expense && a.balance < a.expected_monthly_expense * 0.2 && a.balance >= 0
  );

  const handleCreate = async (data: {
    amount: number;
    date: string;
    expense_account_id: string;
    description: string | null;
  }) => {
    try {
      await createMutation.mutateAsync(data);
      const account = accounts.find((a) => a.id === data.expense_account_id);
      toast({ title: "Expense recorded", description: `৳${data.amount.toLocaleString()} from ${account?.name}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleUpdate = async (data: {
    amount: number;
    date: string;
    expense_account_id: string;
    description: string | null;
  }) => {
    if (!editingExpense) return;
    try {
      await updateMutation.mutateAsync({ id: editingExpense.id, ...data });
      toast({ title: "Expense updated" });
      setEditingExpense(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({ title: "Expense deleted" });
      setDeleteId(null);
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
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">Record and track your spending by khata</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={accounts.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {accounts.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Create expense accounts (khatas) first before recording expenses.
          </AlertDescription>
        </Alert>
      )}

      {/* Deficit Warnings */}
      {accountsWithDeficit.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Deficit Alert:</strong>{" "}
            {accountsWithDeficit.map((a) => (
              <span key={a.id} className="mr-2">
                {a.name} (৳{Math.abs(a.balance).toLocaleString()} over)
              </span>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {accountsNearLimit.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Low Balance:</strong>{" "}
            {accountsNearLimit.map((a) => (
              <span key={a.id} className="mr-2">
                {a.name} (৳{a.balance.toLocaleString()} left)
              </span>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">৳{(summary?.thisMonth || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Year</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">৳{(summary?.thisYear || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">All Time</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">৳{(summary?.total || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Account Balances */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Khata Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    account.balance < 0 ? "border-destructive/50 bg-destructive/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: account.color }}
                    />
                    <span className="font-medium">{account.name}</span>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-bold ${
                        account.balance < 0 ? "text-destructive" : "text-foreground"
                      }`}
                    >
                      ৳{account.balance.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ৳{account.total_spent.toLocaleString()} / ৳{account.total_allocated.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense Table */}
      {expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No expenses recorded</h3>
            <p className="mb-4 max-w-sm text-muted-foreground">
              Start tracking your spending. Each expense will be deducted from the selected khata's balance.
            </p>
            {accounts.length > 0 && (
              <Button onClick={() => setDialogOpen(true)}>Add First Expense</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expense History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Khata</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-medium">
                        {format(new Date(exp.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="font-semibold text-destructive">
                        ৳{Number(exp.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {exp.expense_accounts ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: exp.expense_accounts.color }}
                            />
                            <span>{exp.expense_accounts.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden max-w-xs truncate md:table-cell">
                        {exp.description || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingExpense(exp);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(exp.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingExpense(null);
        }}
        expense={editingExpense}
        accounts={accounts}
        onSave={editingExpense ? handleUpdate : handleCreate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the expense and restore the amount to the khata's balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
