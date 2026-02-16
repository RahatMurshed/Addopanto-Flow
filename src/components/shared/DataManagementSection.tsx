import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, AlertTriangle, Loader2, Shield } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useDataManagement } from "@/hooks/useDataManagement";
import { RestoreDataDialog } from "@/components/dialogs/RestoreDataDialog";
import { ResetDataDialog } from "@/components/dialogs/ResetDataDialog";
import { useCompany } from "@/contexts/CompanyContext";

export function DataManagementSection() {
  const { isCipher } = useCompany();
  const { exportData, isExporting, exportProgress, exportStep } = useDataManagement();
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Only Cipher can see this section
  if (!isCipher) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>Cipher-only: Backup, restore, or reset company data</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Backup & Restore Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Backup & Restore</h4>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={exportData} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {isExporting ? "Backing up..." : "Backup Data"}
              </Button>
              <Button variant="outline" onClick={() => setRestoreDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Restore Data
              </Button>
            </div>
            {isExporting && (
              <div className="space-y-2">
                <Progress value={exportProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">{exportStep} ({Math.round(exportProgress)}%)</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Download a complete backup of all company data or restore from a previous backup.
            </p>
          </div>

          {/* Danger Zone */}
          <div className="rounded-lg border border-destructive/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h4 className="font-medium text-destructive">Danger Zone</h4>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Permanently delete all company data. This action cannot be undone. The company entity
              and admin user will be preserved.
            </p>
            <Button variant="destructive" onClick={() => setResetDialogOpen(true)}>
              Reset All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <RestoreDataDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen} />
      <ResetDataDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen} />
    </>
  );
}
