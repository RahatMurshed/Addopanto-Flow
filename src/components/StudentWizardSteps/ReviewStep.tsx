import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Pencil } from "lucide-react";
import type { PersonalData } from "./PersonalStep";
import type { ContactData } from "./ContactStep";
import type { FamilyData } from "./FamilyStep";
import type { AcademicData } from "./AcademicStep";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import InitialPaymentSection, { type InitialPaymentData } from "@/components/InitialPaymentSection";

interface Props {
  personal: PersonalData;
  contact: ContactData;
  family: FamilyData;
  academic: AcademicData;
  initialPayment: InitialPaymentData;
  onPaymentChange: (data: InitialPaymentData) => void;
  onGoToStep: (step: number) => void;
  disabled?: boolean;
}

function Section({ title, step, onEdit, children }: { title: string; step: number; onEdit: (s: number) => void; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h4>
        <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(step)} className="h-7 text-xs">
          <Pencil className="mr-1 h-3 w-3" /> Edit
        </Button>
      </div>
      <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] break-words">{value}</span>
    </div>
  );
}

export default function ReviewStep({ personal, contact, family, academic, initialPayment, onPaymentChange, onGoToStep, disabled }: Props) {
  const { fc: formatCurrency, currencyCode: currency } = useCompanyCurrency();

  const admFee = academic.admission_fee_total;
  const monthFee = academic.monthly_fee_amount;

  return (
    <div className="space-y-4">
      <Section title="Personal Information" step={0} onEdit={onGoToStep}>
        <Field label="Full Name" value={personal.name} />
        <Field label="Date of Birth" value={personal.date_of_birth} />
        <Field label="Gender" value={personal.gender} />
        <Field label="Blood Group" value={personal.blood_group} />
        <Field label="Religion/Category" value={personal.religion_category} />
        <Field label="Nationality" value={personal.nationality} />
        <Field label="Aadhar/ID" value={personal.aadhar_id_number} />
      </Section>

      <Section title="Contact Information" step={1} onEdit={onGoToStep}>
        <Field label="Mobile" value={contact.phone} />
        <Field label="WhatsApp" value={contact.whatsapp_number} />
        <Field label="Email" value={contact.email} />
        <Field label="City" value={contact.address_city} />
        <Field label="State" value={contact.address_state} />
      </Section>

      <Section title="Family Information" step={2} onEdit={onGoToStep}>
        <Field label="Father" value={family.father_name} />
        <Field label="Father Contact" value={family.father_contact} />
        <Field label="Mother" value={family.mother_name} />
        <Field label="Mother Contact" value={family.mother_contact} />
        {family.guardian_name && <Field label="Guardian" value={`${family.guardian_name} (${family.guardian_relationship})`} />}
        {family.siblings.length > 0 && <Field label="Siblings" value={`${family.siblings.length} sibling(s)`} />}
      </Section>

      <Section title="Academic & Enrollment" step={3} onEdit={onGoToStep}>
        <Field label="Student ID" value={academic.student_id_number} />
        <Field label="Class/Grade" value={academic.class_grade} />
        <Field label="Academic Year" value={academic.academic_year} />
        <Field label="Enrollment Date" value={academic.enrollment_date} />
        <Field label="Billing Start" value={academic.billing_start_month} />
        <Field label="Status" value={academic.status} />
        {academic.batch_id !== "none" && <Field label="Batch" value={academic.batch_id.slice(0, 8) + "..."} />}
        <Field label="Admission Fee" value={formatCurrency(admFee, currency)} />
        <Field label="Monthly Fee" value={formatCurrency(monthFee, currency)} />
      </Section>

      {/* Initial Payment */}
      {(admFee > 0 || monthFee > 0) && (
        <>
          <Separator />
          <InitialPaymentSection
            admissionFeeTotal={admFee}
            monthlyFeeAmount={monthFee}
            billingStartMonth={academic.billing_start_month}
            currency={currency}
            disabled={!!disabled}
            value={initialPayment}
            onChange={onPaymentChange}
          />
        </>
      )}
    </div>
  );
}
