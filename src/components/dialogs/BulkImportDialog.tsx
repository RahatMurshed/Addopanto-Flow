import { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBatches } from "@/hooks/useBatches";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  X,
} from "lucide-react";
import {
  parseCSV,
  autoMapColumns,
  generateTemplate,
  STUDENT_FIELDS,
  type ParsedCSV,
} from "@/utils/csvImportUtils";

type Step = "upload" | "mapping" | "preview" | "importing" | "results";

interface ImportResult {
  success_count: number;
  failed_count: number;
  duplicate_count: number;
  total_rows: number;
  failed_rows: { row: number; errors: string[]; data: Record<string, unknown> }[];
}

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BulkImportDialog({
  open,
  onOpenChange,
}: BulkImportDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState("");

  const { activeCompanyId } = useCompany();
  const { user } = useAuth();
  const { data: batches = [] } = useBatches();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reset = useCallback(() => {
    setStep("upload");
    setParsed(null);
    setColumnMapping({});
    setSelectedBatchId("");
    setImporting(false);
    setProgress(0);
    setResult(null);
    setFileName("");
  }, []);

  const handleClose = useCallback(
    (open: boolean) => {
      if (!open && !importing) {
        reset();
      }
      if (!importing) onOpenChange(open);
    },
    [importing, onOpenChange, reset]
  );

  // Download template
  const handleDownloadTemplate = () => {
    const csv = generateTemplate();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const text = await file.text();
    const result = parseCSV(text);

    if (result.headers.length === 0 || result.rows.length === 0) {
      toast({
        title: "Invalid file",
        description: "Could not parse any data from the file. Please check the format.",
        variant: "destructive",
      });
      return;
    }

    setParsed(result);
    const autoMapping = autoMapColumns(result.headers);
    setColumnMapping(autoMapping);
    setStep("mapping");
  };

  // Mapping helpers
  const mappedFieldCount = useMemo(
    () => Object.values(columnMapping).filter((v) => v && v !== "skip").length,
    [columnMapping]
  );

  const requiredFieldsMapped = useMemo(() => {
    const mapped = new Set(Object.values(columnMapping));
    return (
      mapped.has("name") &&
      mapped.has("enrollment_date") &&
      mapped.has("billing_start_month")
    );
  }, [columnMapping]);

  // Preview data
  const previewRows = useMemo(() => {
    if (!parsed) return [];
    return parsed.rows.slice(0, 10);
  }, [parsed]);

  // Run import
  const handleImport = async () => {
    if (!parsed || !activeCompanyId || !user) return;

    setStep("importing");
    setImporting(true);
    setProgress(10);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      setProgress(30);

      const response = await supabase.functions.invoke("bulk-import-students", {
        body: {
          rows: parsed.rows,
          column_mapping: columnMapping,
          company_id: activeCompanyId,
          batch_id: selectedBatchId && selectedBatchId !== "none" ? selectedBatchId : undefined,
        },
      });

      setProgress(90);

      if (response.error) {
        throw new Error(response.error.message || "Import failed");
      }

      const importResult = response.data as ImportResult;
      setResult(importResult);
      setStep("results");

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_fee_history"] });

      if (importResult.success_count > 0) {
        toast({
          title: "Import complete",
          description: `${importResult.success_count} students imported successfully.`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Import failed",
        description: err.message,
        variant: "destructive",
      });
      setStep("preview");
    } finally {
      setImporting(false);
      setProgress(100);
    }
  };

  // Download error report
  const handleDownloadErrors = () => {
    if (!result?.failed_rows.length) return;
    const lines = ["Row,Errors,Data"];
    for (const fr of result.failed_rows) {
      const errors = fr.errors.join("; ").replace(/"/g, '""');
      const data = JSON.stringify(fr.data).replace(/"/g, '""');
      lines.push(`${fr.row},"${errors}","${data}"`);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import_errors.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Import Students from CSV"}
            {step === "mapping" && "Map Columns"}
            {step === "preview" && "Preview & Confirm"}
            {step === "importing" && "Importing..."}
            {step === "results" && "Import Results"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a CSV file to bulk import student records."}
            {step === "mapping" && `Map your CSV columns to student fields. ${mappedFieldCount} fields mapped.`}
            {step === "preview" && `${parsed?.rows.length || 0} rows ready. Review before importing.`}
            {step === "importing" && "Please wait while students are being imported..."}
            {step === "results" && "Import completed. See the summary below."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-6 py-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload a CSV file with student data
                  </p>
                  <label>
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button variant="outline" asChild>
                      <span className="cursor-pointer">
                        <FileText className="mr-2 h-4 w-4" />
                        Choose File
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <Button variant="link" onClick={handleDownloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV Template
                </Button>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Required columns:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge>name</Badge>
                  <Badge>enrollment_date</Badge>
                  <Badge>billing_start_month</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Dates should be in YYYY-MM-DD format. Billing months in YYYY-MM format. Max 5,000 rows per import.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === "mapping" && parsed && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  File: <span className="font-medium text-foreground">{fileName}</span> — {parsed.rows.length} rows, {parsed.headers.length} columns
                </p>
              </div>

              {mappedFieldCount === 0 && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-3">
                  <div className="flex items-start gap-2 text-destructive text-sm font-medium">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    No columns were auto-matched to student fields
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your CSV headers don't match any expected student fields. This usually means the file isn't a student data CSV.
                    You can either map columns manually below, or download the template for the correct format.
                  </p>
                  <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                    <Download className="mr-2 h-3 w-3" />
                    Download CSV Template
                  </Button>
                </div>
              )}

              {mappedFieldCount > 0 && !requiredFieldsMapped && (
                <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Required fields (name, enrollment_date, billing_start_month) must be mapped.
                </div>
              )}

              <div className="space-y-2">
                {parsed.headers.map((header) => (
                  <div
                    key={header}
                    className="flex items-center gap-3 p-2 rounded-lg border bg-card"
                  >
                    <span className="text-sm font-mono min-w-[140px] truncate" title={header}>
                      {header}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Select
                      value={columnMapping[header] || "skip"}
                      onValueChange={(val) =>
                        setColumnMapping((prev) => ({
                          ...prev,
                          [header]: val === "skip" ? "" : val,
                        }))
                      }
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Skip this column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">— Skip —</SelectItem>
                        {STUDENT_FIELDS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                            {f.required ? " *" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {columnMapping[header] && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setColumnMapping((prev) => {
                            const copy = { ...prev };
                            delete copy[header];
                            return copy;
                          })
                        }
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Optional batch assignment */}
              <div className="border rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Assign to Batch (optional)</p>
                <Select
                  value={selectedBatchId}
                  onValueChange={setSelectedBatchId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No batch assignment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {batches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.batch_name} ({b.batch_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && parsed && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="outline">{parsed.rows.length} total rows</Badge>
                <Badge variant="outline">{mappedFieldCount} fields mapped</Badge>
                {selectedBatchId && (
                  <Badge className="bg-primary/15 text-primary border-primary/30">
                    Batch assigned
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                Showing first {Math.min(10, previewRows.length)} rows:
              </p>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {Object.entries(columnMapping)
                        .filter(([, v]) => v)
                        .map(([csvCol, dbCol]) => (
                          <TableHead key={csvCol} className="text-xs">
                            {STUDENT_FIELDS.find((f) => f.value === dbCol)?.label || dbCol}
                          </TableHead>
                        ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        {Object.entries(columnMapping)
                          .filter(([, v]) => v)
                          .map(([csvCol]) => (
                            <TableCell key={csvCol} className="text-xs max-w-[150px] truncate">
                              {row[csvCol] || "—"}
                            </TableCell>
                          ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Step 4: Importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="w-full max-w-xs space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-muted-foreground">
                  Importing {parsed?.rows.length} students...
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Results */}
          {step === "results" && result && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{result.total_rows}</p>
                  <p className="text-xs text-muted-foreground">Total Rows</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-green-500/10">
                  <p className="text-2xl font-bold text-green-600">{result.success_count}</p>
                  <p className="text-xs text-muted-foreground">Imported</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-destructive/10">
                  <p className="text-2xl font-bold text-destructive">{result.failed_count}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-yellow-500/10">
                  <p className="text-2xl font-bold text-yellow-600">{result.duplicate_count}</p>
                  <p className="text-xs text-muted-foreground">Duplicates</p>
                </div>
              </div>

              {result.success_count > 0 && (
                <div className="flex items-center gap-2 bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {result.success_count} students imported successfully!
                </div>
              )}

              {result.failed_rows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-destructive flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      {result.failed_rows.length} rows failed
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadErrors}
                    >
                      <Download className="mr-2 h-3 w-3" />
                      Download Error Report
                    </Button>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {result.failed_rows.slice(0, 20).map((fr, i) => (
                      <div
                        key={i}
                        className="text-xs border rounded-md p-2 space-y-1"
                      >
                        <p className="font-medium">Row {fr.row}</p>
                        {fr.errors.map((err, j) => (
                          <p key={j} className="text-destructive">• {err}</p>
                        ))}
                      </div>
                    ))}
                    {result.failed_rows.length > 20 && (
                      <p className="text-xs text-muted-foreground">
                        ... and {result.failed_rows.length - 20} more. Download the error report for full details.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {step === "mapping" && (
              <Button variant="ghost" onClick={() => setStep("upload")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            {step === "preview" && (
              <Button variant="ghost" onClick={() => setStep("mapping")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step !== "importing" && (
              <Button variant="outline" onClick={() => handleClose(false)}>
                {step === "results" ? "Close" : "Cancel"}
              </Button>
            )}
            {step === "mapping" && (
              <Button
                onClick={() => setStep("preview")}
                disabled={!requiredFieldsMapped}
              >
                Preview
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {step === "preview" && (
              <Button onClick={handleImport}>
                <Upload className="mr-2 h-4 w-4" />
                Import {parsed?.rows.length} Students
              </Button>
            )}
            {step === "results" && result && result.failed_count > 0 && (
              <Button onClick={reset}>Import Again</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
