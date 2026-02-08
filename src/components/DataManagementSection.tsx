import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, AlertTriangle, Loader2 } from "lucide-react";
import { useDataManagement } from "@/hooks/useDataManagement";
import { RestoreDataDialog } from "@/components/RestoreDataDialog";
import { ResetDataDialog } from "@/components/ResetDataDialog";

export function DataManagementSection() {
  const { exportData, isExporting } = useDataManagement();
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Backup, restore, or reset your data</CardDescription>
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
                Backup Data
              </Button>
              <Button variant="outline" onClick={() => setRestoreDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Restore Data
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Download a backup of all your data or restore from a previous backup.
            </p>
          </div>

          {/* Danger Zone */}
          <div className="rounded-lg border border-destructive/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h4 className="font-medium text-destructive">Danger Zone</h4>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Permanently delete all your data. This action cannot be undone. Your profile settings
              will be preserved.
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
