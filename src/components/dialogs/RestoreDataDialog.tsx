import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileText, Shield } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useDataManagement } from "@/hooks/useDataManagement";
import { BackupData, BackupPreview } from "@/utils/dataBackupUtils";

interface RestoreDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RestoreDataDialog({ open, onOpenChange }: RestoreDataDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<BackupData | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const { importData, restoreData, isRestoring, restoreProgress, restoreStep } = useDataManagement();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importData(file);
    if (result) {
      setBackup(result.backup);
      setPreview(result.preview);
    }
  };

  const handleRestore = async () => {
    if (!backup) return;
    const success = await restoreData(backup);
    if (success) {
      handleClose();
    }
  };

  const handleClose = () => {
    if (isRestoring) return;
    setBackup(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <DialogTitle>Restore from Backup</DialogTitle>
          </div>
          <DialogDescription>
            {!preview
              ? "Select a backup file to restore your data."
              : "Review the backup contents before restoring."}
          </DialogDescription>
        </DialogHeader>

        {isRestoring ? (
          <div className="space-y-4 py-4">
            <Progress value={restoreProgress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">{restoreStep} ({Math.round(restoreProgress)}%)</p>
          </div>
        ) : !preview ? (
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
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Backup Details</span>
              </div>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Version:</span> {preview.version}
                </p>
                <p>
                  <span className="text-muted-foreground">Created:</span>{" "}
                  {formatDate(preview.exportedAt)}
                </p>
                <p>
                  <span className="text-muted-foreground">From:</span> {preview.userEmail}
                </p>
                {preview.companyName && (
                  <p>
                    <span className="text-muted-foreground">Company:</span> {preview.companyName}
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">Total records:</span> {preview.totalRecords}
                </p>
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
                <li>• {preview.expenseAccountsCount} expense categories</li>
                <li>• {preview.revenueSourcesCount} revenue sources</li>
                <li>• {preview.revenuesCount} revenues</li>
                <li>• {preview.allocationsCount} allocations</li>
                <li>• {preview.expensesCount} expenses</li>
                <li>• {preview.khataTransfersCount} transfers</li>
                {preview.membershipsCount > 0 && <li>• {preview.membershipsCount} memberships</li>}
                {preview.auditLogsCount > 0 && <li>• {preview.auditLogsCount} audit logs</li>}
              </ul>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-sm text-primary">
                <strong>Note:</strong> This will ADD data from your backup. Existing data will NOT
                be deleted.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isRestoring}>
            Cancel
          </Button>
          {preview && !isRestoring && (
            <Button onClick={handleRestore}>
              Restore Data
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
