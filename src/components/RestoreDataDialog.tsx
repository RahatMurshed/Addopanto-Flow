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
import { Upload, Loader2, FileText } from "lucide-react";
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
  const { importData, restoreData, isRestoring } = useDataManagement();

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
          <DialogTitle>Restore from Backup</DialogTitle>
          <DialogDescription>
            {!preview
              ? "Select a backup file to restore your data."
              : "Review the backup contents before restoring."}
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
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
                  <span className="text-muted-foreground">Created:</span>{" "}
                  {formatDate(preview.exportedAt)}
                </p>
                <p>
                  <span className="text-muted-foreground">From:</span> {preview.userEmail}
                </p>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <p className="font-medium mb-3">This backup contains:</p>
              <ul className="space-y-1 text-sm">
                <li>• {preview.expenseAccountsCount} expense accounts (Khatas)</li>
                <li>• {preview.revenueSourcesCount} revenue sources</li>
                <li>• {preview.revenuesCount} revenues</li>
                <li>• {preview.allocationsCount} allocations</li>
                <li>• {preview.expensesCount} expenses</li>
                <li>• {preview.khataTransfersCount} khata transfers</li>
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
          {preview && (
            <Button onClick={handleRestore} disabled={isRestoring}>
              {isRestoring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Restore Data
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
