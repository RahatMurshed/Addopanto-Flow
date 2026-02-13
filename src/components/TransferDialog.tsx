import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, AlertTriangle, Loader2 } from "lucide-react";
import type { AccountBalance } from "@/hooks/useExpenses";

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountBalance[];
  onTransfer: (data: {
    from_account_id: string;
    to_account_id: string;
    amount: number;
    description?: string;
  }) => Promise<void>;
  isPending?: boolean;
}

export default function TransferDialog({
  open,
  onOpenChange,
  accounts,
  onTransfer,
  isPending,
}: TransferDialogProps) {
  const [fromAccountId, setFromAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFromAccountId("");
      setToAccountId("");
      setAmount("");
      setDescription("");
      setError("");
    }
  }, [open]);

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === fromAccountId),
    [accounts, fromAccountId]
  );

  const toAccount = useMemo(
    () => accounts.find((a) => a.id === toAccountId),
    [accounts, toAccountId]
  );

  const amountNum = parseFloat(amount) || 0;

  const projectedFromBalance = fromAccount ? fromAccount.balance - amountNum : 0;
  const projectedToBalance = toAccount ? toAccount.balance + amountNum : 0;

  const isOverBalance = fromAccount && amountNum > fromAccount.balance;
  const isSameAccount = fromAccountId && fromAccountId === toAccountId;
  const isValidAmount = amountNum > 0;
  const canSubmit =
    fromAccountId && toAccountId && isValidAmount && !isSameAccount && !isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!canSubmit) return;

    try {
      await onTransfer({
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount: amountNum,
        description: description.trim() || undefined,
      });
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to transfer");
    }
  };

  const activeAccounts = accounts.filter((a) => a.is_active);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && isPending) return; onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Balance</DialogTitle>
          <DialogDescription>
            Move funds between expense sources without affecting total allocation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* From Account */}
          <div className="space-y-2">
            <Label htmlFor="from-account">From Expense Source</Label>
            <Select value={fromAccountId} onValueChange={setFromAccountId} disabled={isPending}>
              <SelectTrigger id="from-account">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {activeAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: account.color }}
                      />
                      <span>{account.name}</span>
                      <span className="text-muted-foreground">
                        (৳{account.balance.toLocaleString()})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* To Account */}
          <div className="space-y-2">
            <Label htmlFor="to-account">To Expense Source</Label>
            <Select value={toAccountId} onValueChange={setToAccountId} disabled={isPending}>
              <SelectTrigger id="to-account">
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                {activeAccounts.map((account) => (
                  <SelectItem
                    key={account.id}
                    value={account.id}
                    disabled={account.id === fromAccountId}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: account.color }}
                      />
                      <span>{account.name}</span>
                      <span className="text-muted-foreground">
                        (৳{account.balance.toLocaleString()})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isSameAccount && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Cannot transfer to the same expense source.</AlertDescription>
            </Alert>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Balance Warning */}
          {isOverBalance && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will put {fromAccount?.name} into deficit (৳
                {Math.abs(projectedFromBalance).toLocaleString()} over).
              </AlertDescription>
            </Alert>
          )}

          {/* Balance Preview */}
          {fromAccount && toAccount && amountNum > 0 && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Balance Preview
              </p>
              <div className="flex items-center justify-between gap-2 text-sm">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: fromAccount.color }}
                    />
                    <span className="font-medium">{fromAccount.name}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-muted-foreground">
                      ৳{fromAccount.balance.toLocaleString()}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span
                      className={
                        projectedFromBalance < 0
                          ? "font-semibold text-destructive"
                          : "font-semibold"
                      }
                    >
                      ৳{projectedFromBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex-1 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-medium">{toAccount.name}</span>
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: toAccount.color }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-end gap-2">
                    <span className="text-muted-foreground">
                      ৳{toAccount.balance.toLocaleString()}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-semibold text-primary">
                      ৳{projectedToBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Note (optional)</Label>
            <Textarea
              id="description"
              placeholder="Reason for transfer..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              disabled={isPending}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Transferring..." : "Transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
