import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState } from "react";
import { useBatches } from "@/hooks/useBatches";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { Textarea } from "@/components/ui/textarea";

export interface AcademicData {
  student_id_number: string;
  previous_school: string;
  class_grade: string;
  roll_number: string;
  academic_year: string;
  section_division: string;
  previous_qualification: string;
  previous_percentage: string;
  board_university: string;
  // Existing fields
  enrollment_date: string;
  billing_start_month: string;
  course_start_month: string;
  course_end_month: string;
  admission_fee_total: number;
  monthly_fee_amount: number;
  status: "active" | "inactive" | "graduated";
  batch_id: string;
  // Additional
  special_needs_medical: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
  transportation_mode: string;
  distance_from_institution: string;
  extracurricular_interests: string;
  language_proficiency: string;
  notes: string;
}

interface Props {
  data: AcademicData;
  onChange: (data: AcademicData) => void;
  errors: Record<string, string>;
  disabled?: boolean;
  lockedBatch?: boolean;
  defaultBatchId?: string;
}

const yyyyMmRegex = /^\d{4}-\d{2}$/;

export default function AcademicStep({ data, onChange, errors, disabled, lockedBatch, defaultBatchId }: Props) {
  const [calOpen, setCalOpen] = useState(false);
  const update = (partial: Partial<AcademicData>) => onChange({ ...data, ...partial });
  const { data: batches = [] } = useBatches({ status: "active" });
  const { fc: formatCurrency, currencyCode: currency } = useCompanyCurrency();

  const selectedBatch = useMemo(
    () => data.batch_id !== "none" ? batches.find((b) => b.id === data.batch_id) : null,
    [data.batch_id, batches]
  );

  const hasBatch = !!selectedBatch;

  // Auto-set fields from batch
  const batchCourseStartMonth = useMemo(() => {
    if (!selectedBatch) return "";
    const d = new Date(selectedBatch.start_date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [selectedBatch]);

  const batchCourseEndMonth = useMemo(() => {
    if (!selectedBatch || !selectedBatch.course_duration_months) return "";
    const d = new Date(selectedBatch.start_date);
    d.setMonth(d.getMonth() + selectedBatch.course_duration_months - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [selectedBatch]);

  return (
    <div className="space-y-5">
      {/* Academic Background */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Academic Background</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Student ID</Label>
            <Input value={data.student_id_number} onChange={(e) => update({ student_id_number: e.target.value })} disabled={disabled} placeholder="e.g. STU-001" />
          </div>
          <div className="space-y-2">
            <Label>Roll Number</Label>
            <Input value={data.roll_number} onChange={(e) => update({ roll_number: e.target.value })} disabled={disabled} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Class / Grade</Label>
            <Input value={data.class_grade} onChange={(e) => update({ class_grade: e.target.value })} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <Label>Section / Division</Label>
            <Input value={data.section_division} onChange={(e) => update({ section_division: e.target.value })} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <Label>Academic Year</Label>
            <Input value={data.academic_year} onChange={(e) => update({ academic_year: e.target.value })} disabled={disabled} placeholder="e.g. 2025-26" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Previous School/College</Label>
            <Input value={data.previous_school} onChange={(e) => update({ previous_school: e.target.value })} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <Label>Board / University</Label>
            <Input value={data.board_university} onChange={(e) => update({ board_university: e.target.value })} disabled={disabled} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Previous Qualification</Label>
            <Input value={data.previous_qualification} onChange={(e) => update({ previous_qualification: e.target.value })} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <Label>Previous Percentage / Grade</Label>
            <Input value={data.previous_percentage} onChange={(e) => update({ previous_percentage: e.target.value })} disabled={disabled} />
          </div>
        </div>
      </div>

      {/* Enrollment & Batch */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Enrollment Details</h4>

        <div className="space-y-2">
          <Label>Batch</Label>
          <Select value={data.batch_id} onValueChange={(v) => {
            const batch = batches.find(b => b.id === v);
            const updates: Partial<AcademicData> = { batch_id: v };
            if (batch) {
              updates.admission_fee_total = Number(batch.default_admission_fee);
              updates.monthly_fee_amount = Number(batch.default_monthly_fee);
              const sd = new Date(batch.start_date);
              updates.course_start_month = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, "0")}`;
              if (batch.course_duration_months) {
                sd.setMonth(sd.getMonth() + batch.course_duration_months - 1);
                updates.course_end_month = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, "0")}`;
              }
            }
            update(updates);
          }} disabled={disabled || lockedBatch}>
            <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Batch</SelectItem>
              {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.batch_name} ({b.batch_code})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {hasBatch && (
          <div className="rounded-md border bg-muted/50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Info className="h-3.5 w-3.5" /> Inherited from batch
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Admission: {formatCurrency(Number(selectedBatch!.default_admission_fee), currency)}</Badge>
              <Badge variant="secondary">Monthly: {formatCurrency(Number(selectedBatch!.default_monthly_fee), currency)}</Badge>
              {selectedBatch!.course_duration_months && <Badge variant="secondary">Duration: {selectedBatch!.course_duration_months} months</Badge>}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Enrollment Date <span className="text-destructive">*</span></Label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !data.enrollment_date && "text-muted-foreground")} disabled={disabled}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data.enrollment_date ? format(new Date(data.enrollment_date), "PPP") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="start">
                <Calendar mode="single" selected={data.enrollment_date ? new Date(data.enrollment_date) : undefined} onSelect={(d) => { if (d) { update({ enrollment_date: format(d, "yyyy-MM-dd") }); setCalOpen(false); } }} initialFocus />
              </PopoverContent>
            </Popover>
            {errors.enrollment_date && <p className="text-sm text-destructive">{errors.enrollment_date}</p>}
          </div>
          <div className="space-y-2">
            <Label>First Billing Month <span className="text-destructive">*</span></Label>
            <Input value={data.billing_start_month} onChange={(e) => update({ billing_start_month: e.target.value })} disabled={disabled} placeholder="YYYY-MM" />
            {errors.billing_start_month && <p className="text-sm text-destructive">{errors.billing_start_month}</p>}
          </div>
        </div>

        {!hasBatch && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Course Start Month</Label>
                <Input value={data.course_start_month} onChange={(e) => update({ course_start_month: e.target.value })} disabled={disabled} placeholder="YYYY-MM" />
              </div>
              <div className="space-y-2">
                <Label>Course End Month</Label>
                <Input value={data.course_end_month} onChange={(e) => update({ course_end_month: e.target.value })} disabled={disabled} placeholder="YYYY-MM" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Admission Fee Total</Label>
                <Input type="number" step="0.01" min="0" value={data.admission_fee_total || ""} onChange={(e) => update({ admission_fee_total: Number(e.target.value) || 0 })} disabled={disabled} />
              </div>
              <div className="space-y-2">
                <Label>Monthly Fee Amount</Label>
                <Input type="number" step="0.01" min="0" value={data.monthly_fee_amount || ""} onChange={(e) => update({ monthly_fee_amount: Number(e.target.value) || 0 })} disabled={disabled} />
              </div>
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={data.status} onValueChange={(v) => update({ status: v as any })} disabled={disabled}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="graduated">Graduated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Additional Info */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Additional Information</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Emergency Contact Name</Label>
            <Input value={data.emergency_contact_name} onChange={(e) => update({ emergency_contact_name: e.target.value })} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <Label>Emergency Contact Number</Label>
            <Input value={data.emergency_contact_number} onChange={(e) => update({ emergency_contact_number: e.target.value })} disabled={disabled} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Transportation Mode</Label>
            <Input value={data.transportation_mode} onChange={(e) => update({ transportation_mode: e.target.value })} disabled={disabled} placeholder="e.g. Bus, Walk, Car" />
          </div>
          <div className="space-y-2">
            <Label>Distance from Institution</Label>
            <Input value={data.distance_from_institution} onChange={(e) => update({ distance_from_institution: e.target.value })} disabled={disabled} placeholder="e.g. 5 km" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Extracurricular Interests</Label>
            <Input value={data.extracurricular_interests} onChange={(e) => update({ extracurricular_interests: e.target.value })} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <Label>Language Proficiency</Label>
            <Input value={data.language_proficiency} onChange={(e) => update({ language_proficiency: e.target.value })} disabled={disabled} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Special Needs / Medical Conditions</Label>
          <Textarea value={data.special_needs_medical} onChange={(e) => update({ special_needs_medical: e.target.value })} disabled={disabled} rows={2} />
        </div>
        <div className="space-y-2">
          <Label>Notes / Remarks</Label>
          <Textarea value={data.notes} onChange={(e) => update({ notes: e.target.value })} disabled={disabled} rows={2} />
        </div>
      </div>
    </div>
  );
}
