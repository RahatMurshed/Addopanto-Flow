import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Download, FileText, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { exportToPDF } from "@/utils/exportUtils";
import type { StudentFilterValues } from "@/components/StudentFilters";
import type { computeStudentSummary } from "@/hooks/useStudentPayments";

// All possible export columns
const ALL_COLUMNS = [
  // Basic
  { key: "name", label: "Full Name", group: "Basic", default: true },
  { key: "student_id_number", label: "Student ID", group: "Basic", default: true },
  { key: "status", label: "Status", group: "Basic", default: true },
  { key: "roll_number", label: "Roll Number", group: "Basic", default: false },
  { key: "enrollment_date", label: "Enrollment Date", group: "Basic", default: false },

  // Contact
  { key: "phone", label: "Phone", group: "Contact", default: true },
  { key: "whatsapp_number", label: "WhatsApp", group: "Contact", default: false },
  { key: "alt_contact_number", label: "Alt Contact", group: "Contact", default: false },
  { key: "email", label: "Email", group: "Contact", default: true },

  // Address
  { key: "address_city", label: "City", group: "Address", default: false },
  { key: "address_state", label: "State", group: "Address", default: false },
  { key: "address_area", label: "Area", group: "Address", default: false },
  { key: "address_pin_zip", label: "PIN/ZIP", group: "Address", default: false },
  { key: "address_full", label: "Full Address", group: "Address", default: false },

  // Personal
  { key: "date_of_birth", label: "Date of Birth", group: "Personal", default: false },
  { key: "gender", label: "Gender", group: "Personal", default: false },
  { key: "blood_group", label: "Blood Group", group: "Personal", default: false },
  { key: "nationality", label: "Nationality", group: "Personal", default: false },
  { key: "religion_category", label: "Religion/Category", group: "Personal", default: false },
  { key: "aadhar_id_number", label: "Aadhar/ID Number", group: "Personal", default: false },

  // Family
  { key: "father_name", label: "Father's Name", group: "Family", default: true },
  { key: "father_contact", label: "Father's Contact", group: "Family", default: false },
  { key: "father_occupation", label: "Father's Occupation", group: "Family", default: false },
  { key: "father_annual_income", label: "Father's Annual Income", group: "Family", default: false },
  { key: "mother_name", label: "Mother's Name", group: "Family", default: false },
  { key: "mother_contact", label: "Mother's Contact", group: "Family", default: false },
  { key: "mother_occupation", label: "Mother's Occupation", group: "Family", default: false },
  { key: "guardian_name", label: "Guardian Name", group: "Family", default: false },
  { key: "guardian_contact", label: "Guardian Contact", group: "Family", default: false },

  // Academic
  { key: "class_grade", label: "Class/Grade", group: "Academic", default: true },
  { key: "section_division", label: "Section/Division", group: "Academic", default: false },
  { key: "academic_year", label: "Academic Year", group: "Academic", default: false },
  { key: "board_university", label: "Board/University", group: "Academic", default: false },
  { key: "previous_school", label: "Previous School", group: "Academic", default: false },
  { key: "previous_qualification", label: "Previous Qualification", group: "Academic", default: false },
  { key: "previous_percentage", label: "Previous Percentage", group: "Academic", default: false },

  // Financial
  { key: "admission_fee_total", label: "Admission Fee", group: "Financial", default: true },
  { key: "monthly_fee_amount", label: "Monthly Fee", group: "Financial", default: true },
  { key: "total_paid", label: "Total Paid", group: "Financial", default: true },
  { key: "total_pending", label: "Total Pending", group: "Financial", default: true },

  // Additional
  { key: "emergency_contact_name", label: "Emergency Contact", group: "Additional", default: false },
  { key: "emergency_contact_number", label: "Emergency Phone", group: "Additional", default: false },
  { key: "transportation_mode", label: "Transportation", group: "Additional", default: false },
  { key: "special_needs_medical", label: "Special Needs/Medical", group: "Additional", default: false },
  { key: "notes", label: "Notes", group: "Additional", default: false },
] as const;

type ColumnKey = (typeof ALL_COLUMNS)[number]["key"];

const GROUPS = [...new Set(ALL_COLUMNS.map(c => c.group))];

// Preset definitions
const PRESETS = [
  { id: "default", label: "Default", columns: ALL_COLUMNS.filter(c => c.default).map(c => c.key) },
  { id: "basic", label: "Basic Info", columns: ["name", "student_id_number", "status", "phone", "email", "class_grade"] as ColumnKey[] },
  { id: "contact", label: "Contact Details", columns: ["name", "student_id_number", "phone", "whatsapp_number", "alt_contact_number", "email", "father_name", "father_contact", "mother_name", "mother_contact", "address_city", "address_state"] as ColumnKey[] },
  { id: "financial", label: "Financial Summary", columns: ["name", "student_id_number", "status", "admission_fee_total", "monthly_fee_amount", "total_paid", "total_pending"] as ColumnKey[] },
  { id: "academic", label: "Academic Info", columns: ["name", "student_id_number", "class_grade", "section_division", "academic_year", "board_university", "roll_number", "previous_school", "previous_qualification", "previous_percentage"] as ColumnKey[] },
  { id: "all", label: "All Columns", columns: ALL_COLUMNS.map(c => c.key) },
];

interface StudentExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: any[];
  studentSummaries: Map<string, ReturnType<typeof computeStudentSummary>>;
  filters: StudentFilterValues;
  totalCount: number;
}

export default function StudentExportDialog({
  open, onOpenChange, students, studentSummaries, filters, totalCount,
}: StudentExportDialogProps) {
  const [selectedColumns, setSelectedColumns] = useState<Set<ColumnKey>>(
    new Set(ALL_COLUMNS.filter(c => c.default).map(c => c.key))
  );
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { fc: formatCurrency, currencyCode: currency } = useCompanyCurrency();

  const toggleColumn = (key: ColumnKey) => {
    setSelectedColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleGroup = (group: string) => {
    const groupCols = ALL_COLUMNS.filter(c => c.group === group);
    const allSelected = groupCols.every(c => selectedColumns.has(c.key));
    setSelectedColumns(prev => {
      const next = new Set(prev);
      groupCols.forEach(c => {
        if (allSelected) next.delete(c.key);
        else next.add(c.key);
      });
      return next;
    });
  };

  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) setSelectedColumns(new Set(preset.columns));
  };

  // Get active filter description
  const activeFilterDescription = useMemo(() => {
    const parts: string[] = [];
    if (filters.status !== "all") parts.push(`Status: ${filters.status}`);
    if (filters.batchId !== "all") parts.push("Batch filtered");
    if (filters.gender !== "all") parts.push(`Gender: ${filters.gender}`);
    if (filters.classGrade) parts.push(`Class: ${filters.classGrade}`);
    if (filters.addressCity) parts.push(`City: ${filters.addressCity}`);
    if (filters.academicYear) parts.push(`Year: ${filters.academicYear}`);
    if (filters.search) parts.push(`Search: "${filters.search}"`);
    return parts.length > 0 ? parts.join(", ") : "No filters applied";
  }, [filters]);

  const getStudentValue = (student: any, key: ColumnKey): string => {
    const sum = studentSummaries.get(student.id);
    switch (key) {
      case "total_paid": return String(sum?.totalPaid ?? 0);
      case "total_pending": return String(sum?.totalPending ?? 0);
      case "address_full": {
        const parts = [student.address_house, student.address_street, student.address_area, student.address_city, student.address_state, student.address_pin_zip].filter(Boolean);
        return parts.join(", ");
      }
      default: return String(student[key] ?? "");
    }
  };

  const handleExport = async () => {
    if (selectedColumns.size === 0) {
      toast({ title: "Select at least one column", variant: "destructive" });
      return;
    }
    setIsExporting(true);
    try {
      const cols = ALL_COLUMNS.filter(c => selectedColumns.has(c.key));

      if (exportFormat === "csv") {
        const headers = cols.map(c => c.label);
        const rows = students.map(s =>
          cols.map(c => `"${getStudentValue(s, c.key).replace(/"/g, '""')}"`)
        );
        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `students_${format(new Date(), "yyyy-MM-dd")}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
      } else {
        await exportToPDF(
          "students-table",
          `students_${format(new Date(), "yyyy-MM-dd")}`,
          "Student List",
          format(new Date(), "MMMM yyyy")
        );
      }
      toast({ title: `Exported ${students.length} students as ${exportFormat.toUpperCase()}` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Students</DialogTitle>
          <DialogDescription>
            Exporting {students.length} of {totalCount} students (filtered view)
          </DialogDescription>
        </DialogHeader>

        {/* Active filters summary */}
        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
          <span className="font-medium text-muted-foreground">Active Filters: </span>
          <span className="text-foreground">{activeFilterDescription}</span>
        </div>

        {/* Format & Preset */}
        <div className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-medium">Format</Label>
            <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "csv" | "pdf")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                <SelectItem value="pdf">PDF (Report)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-medium">Column Preset</Label>
            <Select onValueChange={applyPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Choose preset..." />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Column selection */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">
              Columns ({selectedColumns.size} selected)
            </Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() =>
                setSelectedColumns(prev =>
                  prev.size === ALL_COLUMNS.length
                    ? new Set(ALL_COLUMNS.filter(c => c.default).map(c => c.key))
                    : new Set(ALL_COLUMNS.map(c => c.key))
                )
              }
            >
              {selectedColumns.size === ALL_COLUMNS.length ? "Reset to Default" : "Select All"}
            </Button>
          </div>
          <ScrollArea className="h-56 rounded-md border border-border p-3">
            <div className="space-y-4">
              {GROUPS.map(group => {
                const groupCols = ALL_COLUMNS.filter(c => c.group === group);
                const allGroupSelected = groupCols.every(c => selectedColumns.has(c.key));
                const someGroupSelected = groupCols.some(c => selectedColumns.has(c.key));
                return (
                  <div key={group}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Checkbox
                        checked={allGroupSelected ? true : someGroupSelected ? "indeterminate" : false}
                        onCheckedChange={() => toggleGroup(group)}
                        id={`group-${group}`}
                      />
                      <Label
                        htmlFor={`group-${group}`}
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer"
                      >
                        {group}
                      </Label>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-6">
                      {groupCols.map(col => (
                        <div key={col.key} className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedColumns.has(col.key)}
                            onCheckedChange={() => toggleColumn(col.key)}
                            id={`col-${col.key}`}
                          />
                          <Label htmlFor={`col-${col.key}`} className="text-sm cursor-pointer">
                            {col.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <Separator className="mt-3" />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {exportFormat === "pdf" && (
          <p className="text-xs text-muted-foreground">
            PDF exports the currently visible table. Column selection applies to CSV exports only.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleExport} disabled={isExporting || selectedColumns.size === 0}>
            {isExporting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Exporting...</>
            ) : (
              <><Download className="mr-2 h-4 w-4" />Export {exportFormat.toUpperCase()}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
