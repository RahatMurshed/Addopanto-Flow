import { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { useCreateStudentPayment } from "@/hooks/useStudentPayments";
import { useSaveSiblings } from "@/hooks/useStudentSiblings";
import type { Student, StudentInsert } from "@/hooks/useStudents";
import type { InitialPaymentData } from "@/components/finance/InitialPaymentSection";
import PersonalStep, { type PersonalData } from "@/components/StudentWizardSteps/PersonalStep";
import ContactStep, { type ContactData } from "@/components/StudentWizardSteps/ContactStep";
import FamilyStep, { type FamilyData } from "@/components/StudentWizardSteps/FamilyStep";
import AcademicStep, { type AcademicData } from "@/components/StudentWizardSteps/AcademicStep";
import ReviewStep from "@/components/StudentWizardSteps/ReviewStep";

const STEPS = ["Personal", "Contact", "Family", "Academic", "Review"];

const now = new Date();
const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

const defaultPersonal: PersonalData = {
  name: "", date_of_birth: "", gender: "", blood_group: "",
  religion_category: "", nationality: "", aadhar_id_number: "",
};

const defaultContact: ContactData = {
  phone: "", whatsapp_number: "", alt_contact_number: "", email: "",
  address_house: "", address_street: "", address_area: "", address_city: "",
  address_state: "", address_pin_zip: "", permanent_address_same: true,
  perm_address_house: "", perm_address_street: "", perm_address_area: "",
  perm_address_city: "", perm_address_state: "", perm_address_pin_zip: "",
};

const defaultFamily: FamilyData = {
  father_name: "", father_occupation: "", father_contact: "", father_annual_income: "",
  mother_name: "", mother_occupation: "", mother_contact: "",
  guardian_name: "", guardian_contact: "", guardian_relationship: "",
  siblings: [],
};

const defaultAcademic: AcademicData = {
  student_id_number: "", previous_school: "", class_grade: "", roll_number: "",
  academic_year: "", section_division: "", previous_qualification: "",
  previous_percentage: "", board_university: "",
  enrollment_date: format(new Date(), "yyyy-MM-dd"), billing_start_month: currentYearMonth,
  course_start_month: "", course_end_month: "", admission_fee_total: 0,
  monthly_fee_amount: 0, status: "active", batch_id: "none",
  special_needs_medical: "", emergency_contact_name: "", emergency_contact_number: "",
  transportation_mode: "", distance_from_institution: "", extracurricular_interests: "",
  language_proficiency: "", notes: "",
};

const defaultPayment: InitialPaymentData = {
  paymentType: "admission", admissionAmount: 0, monthlyMonths: [],
  monthlyAmount: 0, paymentMethod: "cash", receiptNumber: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: StudentInsert) => Promise<Student | void>;
  defaultBatchId?: string;
  lockedBatch?: boolean;
  student?: Student;
}

export default function StudentWizardDialog({ open, onOpenChange, onSave, defaultBatchId, lockedBatch, student: editStudent }: Props) {
  const isEditMode = !!editStudent;
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savingStep, setSavingStep] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { activeCompanyId } = useCompany();
  const createPaymentMutation = useCreateStudentPayment();
  const saveSiblingsMutation = useSaveSiblings();

  const [personal, setPersonal] = useState<PersonalData>(defaultPersonal);
  const [contact, setContact] = useState<ContactData>(defaultContact);
  const [family, setFamily] = useState<FamilyData>(defaultFamily);
  const [academic, setAcademic] = useState<AcademicData>({ ...defaultAcademic, batch_id: defaultBatchId || "none" });
  const [initialPayment, setInitialPayment] = useState<InitialPaymentData>(defaultPayment);

  // Pre-fill from student data in edit mode
  useEffect(() => {
    if (open && isEditMode && editStudent) {
      setPersonal({
        name: editStudent.name || "",
        date_of_birth: editStudent.date_of_birth || "",
        gender: editStudent.gender || "",
        blood_group: editStudent.blood_group || "",
        religion_category: editStudent.religion_category || "",
        nationality: editStudent.nationality || "",
        aadhar_id_number: editStudent.aadhar_id_number || "",
      });
      setContact({
        phone: editStudent.phone || "",
        whatsapp_number: editStudent.whatsapp_number || "",
        alt_contact_number: editStudent.alt_contact_number || "",
        email: editStudent.email || "",
        address_house: editStudent.address_house || "",
        address_street: editStudent.address_street || "",
        address_area: editStudent.address_area || "",
        address_city: editStudent.address_city || "",
        address_state: editStudent.address_state || "",
        address_pin_zip: editStudent.address_pin_zip || "",
        permanent_address_same: editStudent.permanent_address_same ?? true,
        perm_address_house: editStudent.perm_address_house || "",
        perm_address_street: editStudent.perm_address_street || "",
        perm_address_area: editStudent.perm_address_area || "",
        perm_address_city: editStudent.perm_address_city || "",
        perm_address_state: editStudent.perm_address_state || "",
        perm_address_pin_zip: editStudent.perm_address_pin_zip || "",
      });
      setFamily({
        father_name: editStudent.father_name || "",
        father_occupation: editStudent.father_occupation || "",
        father_contact: editStudent.father_contact || "",
        father_annual_income: editStudent.father_annual_income != null ? String(editStudent.father_annual_income) : "",
        mother_name: editStudent.mother_name || "",
        mother_occupation: editStudent.mother_occupation || "",
        mother_contact: editStudent.mother_contact || "",
        guardian_name: editStudent.guardian_name || "",
        guardian_contact: editStudent.guardian_contact || "",
        guardian_relationship: editStudent.guardian_relationship || "",
        siblings: [],
      });
      setAcademic({
        student_id_number: editStudent.student_id_number || "",
        previous_school: editStudent.previous_school || "",
        class_grade: editStudent.class_grade || "",
        roll_number: editStudent.roll_number || "",
        academic_year: editStudent.academic_year || "",
        section_division: editStudent.section_division || "",
        previous_qualification: editStudent.previous_qualification || "",
        previous_percentage: editStudent.previous_percentage || "",
        board_university: editStudent.board_university || "",
        enrollment_date: editStudent.enrollment_date || format(new Date(), "yyyy-MM-dd"),
        billing_start_month: editStudent.billing_start_month || currentYearMonth,
        course_start_month: editStudent.course_start_month || "",
        course_end_month: editStudent.course_end_month || "",
        admission_fee_total: editStudent.admission_fee_total ?? 0,
        monthly_fee_amount: editStudent.monthly_fee_amount ?? 0,
        status: (["active", "inactive", "graduated"].includes(editStudent.status) ? editStudent.status : "active") as AcademicData["status"],
        batch_id: editStudent.batch_id || "none",
        special_needs_medical: editStudent.special_needs_medical || "",
        emergency_contact_name: editStudent.emergency_contact_name || "",
        emergency_contact_number: editStudent.emergency_contact_number || "",
        transportation_mode: editStudent.transportation_mode || "",
        distance_from_institution: editStudent.distance_from_institution || "",
        extracurricular_interests: editStudent.extracurricular_interests || "",
        language_proficiency: editStudent.language_proficiency || "",
        notes: editStudent.notes || "",
      });
      setInitialPayment(defaultPayment);
    }
  }, [open, isEditMode]);

  // Auto-save draft to localStorage (skip in edit mode)
  const draftKey = `student-draft-${activeCompanyId}`;
  useEffect(() => {
    if (open && activeCompanyId && !isEditMode) {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        try {
          const d = JSON.parse(saved);
          if (d.personal) setPersonal(d.personal);
          if (d.contact) setContact(d.contact);
          if (d.family) setFamily(d.family);
          if (d.academic) setAcademic({ ...defaultAcademic, ...d.academic, batch_id: defaultBatchId || d.academic.batch_id || "none" });
        } catch { /* ignore */ }
      }
    }
  }, [open, activeCompanyId]);

  useEffect(() => {
    if (open && activeCompanyId && !isEditMode) {
      const timer = setTimeout(() => {
        localStorage.setItem(draftKey, JSON.stringify({ personal, contact, family, academic }));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [personal, contact, family, academic, open, activeCompanyId]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setStep(0);
      setErrors({});
      setSaving(false);
      setSavingStep("");
    }
  }, [open]);

  const validateStep = useCallback((s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 0) {
      if (!personal.name.trim()) errs.name = "Name is required";
      if (!personal.date_of_birth) errs.date_of_birth = "Date of birth is required";
    }
    if (s === 1) {
      if (!contact.phone.trim()) errs.phone = "Mobile number is required";
      if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) errs.email = "Invalid email";
    }
    if (s === 2) {
      if (!family.father_name.trim()) errs.father_name = "Father's name is required";
      if (!family.mother_name.trim()) errs.mother_name = "Mother's name is required";
    }
    if (s === 3) {
      if (!academic.enrollment_date) errs.enrollment_date = "Required";
      if (!academic.billing_start_month || !/^\d{4}-\d{2}$/.test(academic.billing_start_month)) errs.billing_start_month = "Format: YYYY-MM";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [personal, contact, family, academic]);

  const goNext = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  };

  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    // Validate all steps
    for (let i = 0; i < 4; i++) {
      if (!validateStep(i)) {
        setStep(i);
        return;
      }
    }

    setSaving(true);
    try {
      setSavingStep(isEditMode ? "Updating student..." : "Creating student...");
      const insertData: StudentInsert = {
        name: personal.name.trim(),
        student_id_number: academic.student_id_number || null,
        email: contact.email || null,
        phone: contact.phone || null,
        enrollment_date: academic.enrollment_date,
        billing_start_month: academic.billing_start_month,
        course_start_month: academic.course_start_month || null,
        course_end_month: academic.course_end_month || null,
        admission_fee_total: academic.admission_fee_total,
        monthly_fee_amount: academic.monthly_fee_amount,
        status: academic.status,
        notes: academic.notes || null,
        batch_id: (academic.batch_id && academic.batch_id !== "none") ? academic.batch_id : null,
        // New extended fields
        date_of_birth: personal.date_of_birth || null,
        gender: personal.gender || null,
        blood_group: personal.blood_group || null,
        religion_category: personal.religion_category || null,
        nationality: personal.nationality || null,
        aadhar_id_number: personal.aadhar_id_number || null,
        whatsapp_number: contact.whatsapp_number || null,
        alt_contact_number: contact.alt_contact_number || null,
        address_house: contact.address_house || null,
        address_street: contact.address_street || null,
        address_area: contact.address_area || null,
        address_city: contact.address_city || null,
        address_state: contact.address_state || null,
        address_pin_zip: contact.address_pin_zip || null,
        permanent_address_same: contact.permanent_address_same,
        perm_address_house: contact.perm_address_house || null,
        perm_address_street: contact.perm_address_street || null,
        perm_address_area: contact.perm_address_area || null,
        perm_address_city: contact.perm_address_city || null,
        perm_address_state: contact.perm_address_state || null,
        perm_address_pin_zip: contact.perm_address_pin_zip || null,
        father_name: family.father_name || null,
        father_occupation: family.father_occupation || null,
        father_contact: family.father_contact || null,
        father_annual_income: family.father_annual_income ? Number(family.father_annual_income) : null,
        mother_name: family.mother_name || null,
        mother_occupation: family.mother_occupation || null,
        mother_contact: family.mother_contact || null,
        guardian_name: family.guardian_name || null,
        guardian_contact: family.guardian_contact || null,
        guardian_relationship: family.guardian_relationship || null,
        previous_school: academic.previous_school || null,
        class_grade: academic.class_grade || null,
        roll_number: academic.roll_number || null,
        academic_year: academic.academic_year || null,
        section_division: academic.section_division || null,
        previous_qualification: academic.previous_qualification || null,
        previous_percentage: academic.previous_percentage || null,
        board_university: academic.board_university || null,
        special_needs_medical: academic.special_needs_medical || null,
        emergency_contact_name: academic.emergency_contact_name || null,
        emergency_contact_number: academic.emergency_contact_number || null,
        transportation_mode: academic.transportation_mode || null,
        distance_from_institution: academic.distance_from_institution || null,
        extracurricular_interests: academic.extracurricular_interests || null,
        language_proficiency: academic.language_proficiency || null,
      };

      const result = await onSave(insertData);

      // Save siblings
      if (result && "id" in result && family.siblings.length > 0) {
        setSavingStep("Saving family info...");
        try {
          await saveSiblingsMutation.mutateAsync({ studentId: result.id, siblings: family.siblings });
        } catch (e: any) {
          toast({ title: "Student created, but sibling info failed", description: e.message, variant: "destructive" });
        }
      }

      // Record initial payment (skip in edit mode)
      if (!isEditMode) {
        const hasPayment =
          (initialPayment.paymentType === "admission" || initialPayment.paymentType === "both") && initialPayment.admissionAmount > 0 ||
          (initialPayment.paymentType === "monthly" || initialPayment.paymentType === "both") && initialPayment.monthlyMonths.length > 0;

        if (hasPayment && result && "id" in result) {
          setSavingStep("Recording payment...");
          const showAdmission = initialPayment.paymentType === "admission" || initialPayment.paymentType === "both";
          const showMonthly = initialPayment.paymentType === "monthly" || initialPayment.paymentType === "both";
          try {
            if (showAdmission && initialPayment.admissionAmount > 0) {
              await createPaymentMutation.mutateAsync({
                student_id: result.id,
                payment_type: "admission",
                amount: initialPayment.admissionAmount,
                payment_date: format(new Date(), "yyyy-MM-dd"),
                payment_method: initialPayment.paymentMethod,
                receipt_number: initialPayment.receiptNumber || null,
                studentName: personal.name,
              });
            }
            if (showMonthly && initialPayment.monthlyMonths.length > 0 && initialPayment.monthlyAmount > 0) {
              await createPaymentMutation.mutateAsync({
                student_id: result.id,
                payment_type: "monthly",
                amount: initialPayment.monthlyAmount,
                payment_date: format(new Date(), "yyyy-MM-dd"),
                payment_method: initialPayment.paymentMethod,
                months_covered: initialPayment.monthlyMonths,
                receipt_number: initialPayment.receiptNumber || null,
                studentName: personal.name,
              });
            }
          } catch (payErr: any) {
            toast({ title: "Student created but payment failed", description: payErr.message, variant: "destructive" });
          }
        }
      }

      // Clear draft
      localStorage.removeItem(draftKey);

      // Reset form
      setPersonal(defaultPersonal);
      setContact(defaultContact);
      setFamily(defaultFamily);
      setAcademic({ ...defaultAcademic, batch_id: defaultBatchId || "none" });
      setInitialPayment(defaultPayment);
      onOpenChange(false);
    } finally {
      setSaving(false);
      setSavingStep("");
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && saving) return; onOpenChange(o); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => { if (saving) e.preventDefault(); }} onEscapeKeyDown={(e) => { if (saving) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Student" : "Add New Student"}</DialogTitle>
          <DialogDescription>
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between">
            {STEPS.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => { if (i < step) setStep(i); }}
                className={`text-xs transition-colors ${
                  i === step ? "font-semibold text-primary" :
                  i < step ? "text-muted-foreground hover:text-foreground cursor-pointer" :
                  "text-muted-foreground/50"
                }`}
                disabled={i > step}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">
          {step === 0 && <PersonalStep data={personal} onChange={setPersonal} errors={errors} disabled={saving} />}
          {step === 1 && <ContactStep data={contact} onChange={setContact} errors={errors} disabled={saving} />}
          {step === 2 && <FamilyStep data={family} onChange={setFamily} errors={errors} disabled={saving} />}
          {step === 3 && <AcademicStep data={academic} onChange={setAcademic} errors={errors} disabled={saving} lockedBatch={lockedBatch} defaultBatchId={defaultBatchId} />}
          {step === 4 && (
            <ReviewStep
              personal={personal} contact={contact} family={family} academic={academic}
              initialPayment={initialPayment} onPaymentChange={setInitialPayment}
              onGoToStep={setStep} disabled={saving} hidePayment={isEditMode}
            />
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <div>
            {step > 0 && (
              <Button type="button" variant="outline" onClick={goPrev} disabled={saving}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={goNext} disabled={saving}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={saving}>
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{savingStep || "Saving..."}</>
                ) : (
                  <><Check className="mr-1 h-4 w-4" /> {isEditMode ? "Update Student" : "Add Student"}</>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
