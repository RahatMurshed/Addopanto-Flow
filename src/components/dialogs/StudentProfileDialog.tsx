import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Pencil, User, Phone, MapPin, Users, GraduationCap, FileText, ShieldAlert } from "lucide-react";
import type { Student } from "@/hooks/useStudents";
import { useCompany } from "@/contexts/CompanyContext";

interface Props {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  canEdit?: boolean;
  batchName?: string;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof User; title: string; children: React.ReactNode }) {
  const hasContent = (() => {
    if (!children) return false;
    const arr = Array.isArray(children) ? children : [children];
    return arr.some(c => c != null && c !== false);
  })();
  if (!hasContent) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 pl-6">
        {children}
      </div>
    </div>
  );
}

export default function StudentProfileDialog({ student, open, onOpenChange, onEdit, canEdit, batchName }: Props) {
  const { canViewStudentPII } = useCompany();
  if (!student) return null;

  const s = student;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">{s.name}</SheetTitle>
            {canEdit && onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="mr-2 h-3.5 w-3.5" />Edit
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            <Badge variant={s.status === "active" ? "default" : "secondary"} className="capitalize">{s.status}</Badge>
            {s.batch_id ? (
              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">Enrolled</Badge>
            ) : (
              <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30">Not Enrolled</Badge>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-5 pb-6">
          {/* Personal Information */}
          <Section icon={User} title="Personal Information">
            <InfoRow label="Full Name" value={s.name} />
            <InfoRow label="Student ID" value={s.student_id_number} />
            {canViewStudentPII && (
              <>
                <InfoRow label="Date of Birth" value={s.date_of_birth ? format(new Date(s.date_of_birth), "PPP") : null} />
                <InfoRow label="Gender" value={s.gender} />
                <InfoRow label="Blood Group" value={s.blood_group} />
                <InfoRow label="Religion / Category" value={s.religion_category} />
                <InfoRow label="Nationality" value={s.nationality} />
                <InfoRow label="Aadhar / ID Number" value={s.aadhar_id_number} />
              </>
            )}
          </Section>

          <Separator />

          {/* Contact Information — PII only */}
          {canViewStudentPII && (
            <>
              <Section icon={Phone} title="Contact Information">
                <InfoRow label="Phone" value={s.phone} />
                <InfoRow label="WhatsApp" value={s.whatsapp_number} />
                <InfoRow label="Email" value={s.email} />
                <InfoRow label="Alt. Contact" value={s.alt_contact_number} />
                <InfoRow label="Emergency Contact" value={s.emergency_contact_name} />
                <InfoRow label="Emergency Number" value={s.emergency_contact_number} />
              </Section>

              <Separator />

              {/* Current Address */}
              <Section icon={MapPin} title="Current Address">
                <InfoRow label="House / Flat" value={s.address_house} />
                <InfoRow label="Street" value={s.address_street} />
                <InfoRow label="Area / Locality" value={s.address_area} />
                <InfoRow label="City" value={s.address_city} />
                <InfoRow label="State" value={s.address_state} />
                <InfoRow label="PIN / ZIP" value={s.address_pin_zip} />
              </Section>

              {/* Permanent Address */}
              {!s.permanent_address_same && (
                <>
                  <Separator />
                  <Section icon={MapPin} title="Permanent Address">
                    <InfoRow label="House / Flat" value={s.perm_address_house} />
                    <InfoRow label="Street" value={s.perm_address_street} />
                    <InfoRow label="Area / Locality" value={s.perm_address_area} />
                    <InfoRow label="City" value={s.perm_address_city} />
                    <InfoRow label="State" value={s.perm_address_state} />
                    <InfoRow label="PIN / ZIP" value={s.perm_address_pin_zip} />
                  </Section>
                </>
              )}

              <Separator />

              {/* Family Details */}
              <Section icon={Users} title="Family Details">
                <InfoRow label="Father's Name" value={s.father_name} />
                <InfoRow label="Father's Occupation" value={s.father_occupation} />
                <InfoRow label="Father's Contact" value={s.father_contact} />
                <InfoRow label="Father's Annual Income" value={s.father_annual_income ? `${s.father_annual_income}` : null} />
                <InfoRow label="Mother's Name" value={s.mother_name} />
                <InfoRow label="Mother's Occupation" value={s.mother_occupation} />
                <InfoRow label="Mother's Contact" value={s.mother_contact} />
                <InfoRow label="Guardian's Name" value={s.guardian_name} />
                <InfoRow label="Guardian's Contact" value={s.guardian_contact} />
                <InfoRow label="Guardian Relationship" value={s.guardian_relationship} />
              </Section>

              <Separator />
            </>
          )}

          {!canViewStudentPII && (
            <>
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>Contact, address, and family details are restricted to administrators.</span>
              </div>
              <Separator />
            </>
          )}

          {/* Academic Information */}
          <Section icon={GraduationCap} title="Academic Information">
            <InfoRow label="Class / Grade" value={s.class_grade} />
            <InfoRow label="Roll Number" value={s.roll_number} />
            <InfoRow label="Section / Division" value={s.section_division} />
            <InfoRow label="Academic Year" value={s.academic_year} />
            {canViewStudentPII && (
              <>
                <InfoRow label="Board / University" value={s.board_university} />
                <InfoRow label="Previous School" value={s.previous_school} />
                <InfoRow label="Previous Qualification" value={s.previous_qualification} />
                <InfoRow label="Previous Percentage" value={s.previous_percentage} />
              </>
            )}
            <InfoRow label="Batch" value={batchName && batchName !== "—" ? batchName : null} />
            <InfoRow label="Enrollment Date" value={format(new Date(s.enrollment_date), "PPP")} />
          </Section>

          <Separator />

          {/* Additional Details */}
          {canViewStudentPII && (
            <Section icon={FileText} title="Additional Details">
              <InfoRow label="Transportation Mode" value={s.transportation_mode} />
              <InfoRow label="Distance from Institution" value={s.distance_from_institution} />
              <InfoRow label="Language Proficiency" value={s.language_proficiency} />
              <InfoRow label="Extracurricular Interests" value={s.extracurricular_interests} />
              <InfoRow label="Special Needs / Medical" value={s.special_needs_medical} />
              {s.notes && (
                <div className="col-span-2">
                  <InfoRow label="Notes" value={s.notes} />
                </div>
              )}
            </Section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
