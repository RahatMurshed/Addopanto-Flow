import { useState, useRef, useEffect } from "react";
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
import { Upload, Loader2, FileText, Shield, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useDataManagement } from "@/hooks/useDataManagement";
import { BackupData, BackupPreview } from "@/utils/dataBackupUtils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface RestoreDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CONFIRMATION_TEXT = "RESTORE DATA";
const COOLDOWN_SECONDS = 5;

export function RestoreDataDialog({ open, onOpenChange }: RestoreDataDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<BackupData | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [step, setStep] = useState<"upload" | "preview" | "confirm" | "password">("upload");
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const { importData, restoreData, isRestoring, restoreProgress, restoreStep } = useDataManagement();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setBackup(null);
      setPreview(null);
      setStep("upload");
      setConfirmText("");
      setPassword("");
      setCooldown(0);
      setError("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importData(file);
    if (result) {
      setBackup(result.backup);
      setPreview(result.preview);
      setStep("preview");
    }
  };

  const handleProceedToConfirm = () => {
    setError("");
    setStep("confirm");
  };

  const handleProceedToPassword = () => {
    if (confirmText !== CONFIRMATION_TEXT) {
      setError("Text does not match. Please type exactly: " + CONFIRMATION_TEXT);
      return;
    }
    setError("");
    setStep("password");
    setCooldown(COOLDOWN_SECONDS);
  };

  const handleRestore = async () => {
    if (!backup || !user?.email || cooldown > 0) return;
    setError("");

    // Verify password by re-authenticating
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (authError) {
      setError("Incorrect password. Please try again.");
      return;
    }

    const success = await restoreData(backup);
    if (success) {
      handleClose();
    }
  };

  const handleClose = () => {
    if (isRestoring) return;
    onOpenChange(false);
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {isRestoring ? (
          <>
            <DialogHeader>
              <DialogTitle>Restoring Data...</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Progress value={restoreProgress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">{restoreStep} ({Math.round(restoreProgress)}%)</p>
            </div>
          </>
        ) : step === "upload" ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <DialogTitle>Restore from Backup</DialogTitle>
              </div>
              <DialogDescription>
                Select a backup file to restore your data.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <div className="rounded-full bg-muted p-4">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                Select Backup File
              </Button>
              <p className="text-sm text-muted-foreground">Only .json backup files are supported</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
            </DialogFooter>
          </>
        ) : step === "preview" && preview ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <DialogTitle>Restore from Backup</DialogTitle>
              </div>
              <DialogDescription>
                Review the backup contents before restoring.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Backup Details</span>
                </div>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Version:</span> {preview.version}</p>
                  <p><span className="text-muted-foreground">Created:</span> {formatDate(preview.exportedAt)}</p>
                  <p><span className="text-muted-foreground">From:</span> {preview.userEmail}</p>
                  {preview.companyName && (
                    <p><span className="text-muted-foreground">Company:</span> {preview.companyName}</p>
                  )}
                  <p><span className="text-muted-foreground">Total records:</span> {preview.totalRecords}</p>
                </div>
              </div>

              <div className="rounded-lg border p-4 max-h-48 overflow-y-auto">
                <p className="font-medium mb-3">This backup contains:</p>
                <ul className="space-y-1 text-sm">
                  {preview.coursesCount > 0 && <li>• {preview.coursesCount} courses</li>}
                  {preview.batchesCount > 0 && <li>• {preview.batchesCount} batches</li>}
                  {preview.studentsCount > 0 && <li>• {preview.studentsCount} students</li>}
                  {preview.studentPaymentsCount > 0 && <li>• {preview.studentPaymentsCount} student payments</li>}
                  {preview.monthlyFeeHistoryCount > 0 && <li>• {preview.monthlyFeeHistoryCount} fee history records</li>}
                  {preview.siblingsCount > 0 && <li>• {preview.siblingsCount} student siblings</li>}
                  {preview.batchHistoryCount > 0 && <li>• {preview.batchHistoryCount} batch transfer records</li>}
                  <li>• {preview.expenseAccountsCount} expense categories</li>
                  <li>• {preview.revenueSourcesCount} revenue sources</li>
                  <li>• {preview.revenuesCount} revenues</li>
                  <li>• {preview.allocationsCount} allocations</li>
                  <li>• {preview.expensesCount} expenses</li>
                  <li>• {preview.khataTransfersCount} transfers</li>
                  {preview.membershipsCount > 0 && <li>• {preview.membershipsCount} memberships</li>}
                  {preview.auditLogsCount > 0 && <li>• {preview.auditLogsCount} audit logs</li>}
                  {preview.currencyChangeLogsCount > 0 && <li>• {preview.currencyChangeLogsCount} currency change logs</li>}
                </ul>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-sm text-primary">
                  <strong>Note:</strong> This will ADD data from your backup. Existing data will NOT be deleted.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleProceedToConfirm}>Continue</Button>
            </DialogFooter>
          </>
        ) : step === "confirm" ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-destructive/10 p-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <DialogTitle>Confirm Restore</DialogTitle>
              </div>
              <DialogDescription>
                Type <strong>{CONFIRMATION_TEXT}</strong> to confirm you want to restore this backup.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="confirm-restore-text">Type confirmation</Label>
                <Input
                  id="confirm-restore-text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={CONFIRMATION_TEXT}
                  className="font-mono"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleProceedToPassword}
                disabled={confirmText !== CONFIRMATION_TEXT}
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        ) : step === "password" ? (
          <>
            <DialogHeader>
              <DialogTitle>Enter Your Password</DialogTitle>
              <DialogDescription>
                For security, enter your password to proceed with the data restore.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="restore-password">Password</Label>
                <Input
                  id="restore-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleRestore}
                disabled={!password || cooldown > 0}
              >
                {cooldown > 0 ? `Restore Data (${cooldown})` : "Restore Data"}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
