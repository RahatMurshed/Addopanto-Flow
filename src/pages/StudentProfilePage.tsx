import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { useStudent, useUpdateStudent } from "@/hooks/useStudents";
import StudentWizardDialog from "@/components/dialogs/StudentWizardDialog";
import { useStudentPayments, computeStudentSummary, useMonthlyFeeHistory } from "@/hooks/useStudentPayments";
import { useBatch, useBatches } from "@/hooks/useBatches";
import { useCourse } from "@/hooks/useCourses";
import { useStudentSalesNotes, useCreateSalesNote, useUpdateSalesNote, useDeleteSalesNote, NOTE_CATEGORIES, getCategoryInfo, useCustomNoteCategories, useCreateCustomCategory, useDeleteCustomCategory, COLOR_PRESETS } from "@/hooks/useStudentSalesNotes";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Pencil, User, Phone, Users, CreditCard, DollarSign, Plus,
  Trash2, Save, X, CalendarIcon, ChevronLeft, ChevronRight, StickyNote, Loader2, MessageSquare, GraduationCap
} from "lucide-react";
import { usePagination } from "@/hooks/usePagination";

// Profile sub-components
import { ProfileBreadcrumb } from "@/components/students/profile/ProfileBreadcrumb";
import { ProfileHeader } from "@/components/students/profile/ProfileHeader";
import { ProfileStickyBar } from "@/components/students/profile/ProfileStickyBar";
import { ProfileAccessDenied, ProfileNotFound } from "@/components/students/profile/ProfileAccessGate";
import { ProfileSkeleton } from "@/components/students/profile/ProfileSkeleton";
import { PlaceholderCard } from "@/components/students/profile/ProfilePlaceholder";
import { LifetimeValueBanner } from "@/components/students/profile/LifetimeValueBanner";
import { EnrollmentTimeline } from "@/components/students/profile/EnrollmentTimeline";
import { FinancialBreakdown } from "@/components/students/profile/FinancialBreakdown";
import { ProductPurchaseHistory, type ProductPurchase } from "@/components/students/profile/ProductPurchaseHistory";

// ── helpers ──
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value || "—"}</p>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-6 rounded-full bg-primary" />
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="text-lg font-semibold text-primary">{title}</h2>
    </div>
  );
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reads from the FinancialBreakdown query cache to avoid duplicate fetches */
function ProductPurchaseHistoryWrapper({ studentId, companyId, fc }: { studentId: string; companyId: string; fc: (n: number) => string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["financial-breakdown", studentId, companyId],
    queryFn: () => null, // never actually fetches — relies on cache from FinancialBreakdown
    enabled: false,
    staleTime: Infinity,
  });

  const purchases: ProductPurchase[] = useMemo(() => {
    if (!data) return [];
    const d = data as any;
    return (d.sales ?? []).map((s: any) => {
      const product = d.productMap?.get(s.product_id);
      const recordedBy = d.userMap?.get(s.user_id);
      return {
        id: s.id,
        quantity: s.quantity,
        unit_price: Number(s.unit_price),
        total_amount: Number(s.total_amount),
        sale_date: s.sale_date,
        payment_method: s.payment_method,
        user_id: s.user_id,
        productName: product?.name ?? "Unknown Product",
        category: product?.category ?? "General",
        recordedBy: recordedBy ?? undefined,
      };
    });
  }, [data]);

  return (
    <ProductPurchaseHistory
      purchases={purchases}
      companyId={companyId}
      isLoading={isLoading && !data}
      fc={fc}
    />
  );
}

export default function StudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isCipher } = useRole();
  const {
    canEdit, canEditStudent, isDataEntryModerator, canViewStudentPII,
    activeCompanyId, isCompanyAdmin,
  } = useCompany();
  const isAdmin = isCompanyAdmin || isCipher;
  const { fc: formatCurrency, currencyCode: currency } = useCompanyCurrency();

  // ── UUID validation ──
  const isValidUUID = studentId ? UUID_REGEX.test(studentId) : false;

  // ── student data ──
  const { data: student, isLoading: studentLoading } = useStudent(isValidUUID ? studentId : undefined);
  const { data: payments = [], isLoading: paymentsLoading } = useStudentPayments(isValidUUID ? studentId : undefined);
  const { data: feeHistory = [] } = useMonthlyFeeHistory(isValidUUID ? studentId : undefined);
  const batchId = student?.batch_id;
  const { data: batch } = useBatch(batchId ?? undefined);
  const courseId = (batch as any)?.course_id;
  const { data: course } = useCourse(courseId);

  // ── notes ──
  const { data: notes = [], isLoading: notesLoading } = useStudentSalesNotes(isValidUUID ? studentId : undefined);
  const createNote = useCreateSalesNote();
  const updateNote = useUpdateSalesNote();
  const deleteNote = useDeleteSalesNote();

  // ── custom categories ──
  const { data: customCategories = [] } = useCustomNoteCategories();
  const createCustomCategory = useCreateCustomCategory();
  const deleteCustomCategory = useDeleteCustomCategory();
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatColor, setNewCatColor] = useState(COLOR_PRESETS[0].class);

  const allCategories = useMemo(() => [
    ...NOTE_CATEGORIES.map((c) => ({ value: c.value, label: c.label, color: c.color, isCustom: false, id: c.value })),
    ...customCategories.map((c) => ({ value: c.value, label: c.label, color: c.color_class, isCustom: true, id: c.id })),
  ], [customCategories]);

  // ── note form state ──
  const [noteText, setNoteText] = useState("");
  const [noteCategory, setNoteCategory] = useState("general");
  const [noteDate, setNoteDate] = useState<Date>(new Date());
  const [noteError, setNoteError] = useState("");

  // ── note filters ──
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterCreatedBy, setFilterCreatedBy] = useState("all");

  // ── inline edit state ──
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editCategory, setEditCategory] = useState("");

  // ── delete state ──
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  // ── IntersectionObserver for sticky bar ──
  const headerRef = useRef<HTMLDivElement>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsHeaderVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [student]);

  // ── fetch user profiles for notes ──
  const noteUserIds = useMemo(() => [...new Set(notes.map((n) => n.created_by))], [notes]);
  const { data: noteUserProfiles = [] } = useQuery({
    queryKey: ["user_profiles_for_notes", noteUserIds],
    queryFn: async () => {
      if (noteUserIds.length === 0) return [];
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, full_name, avatar_url, email")
        .in("user_id", noteUserIds);
      return data ?? [];
    },
    enabled: noteUserIds.length > 0,
  });

  const userProfileMap = useMemo(() => {
    const map = new Map<string, { full_name: string | null; avatar_url: string | null; email: string | null }>();
    noteUserProfiles.forEach((p: any) => map.set(p.user_id, p));
    return map;
  }, [noteUserProfiles]);

  // ── financial summary ──
  const effectiveAdmissionFee = Number(student?.admission_fee_total) || Number(batch?.default_admission_fee) || 0;
  const effectiveMonthlyFee = Number(student?.monthly_fee_amount) || Number(batch?.default_monthly_fee) || 0;

  const summary = useMemo(() => {
    if (!student) return null;
    const batchCourseStartMonth = batch?.start_date
      ? (() => { const d = new Date(batch.start_date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })()
      : "";
    const batchCourseEndMonth = batch?.start_date && batch?.course_duration_months
      ? (() => { const d = new Date(batch.start_date); d.setMonth(d.getMonth() + batch.course_duration_months - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })()
      : "";
    return computeStudentSummary(
      { ...student, admission_fee_total: effectiveAdmissionFee, monthly_fee_amount: effectiveMonthlyFee, course_start_month: student.course_start_month || batchCourseStartMonth || null, course_end_month: student.course_end_month || batchCourseEndMonth || null },
      payments, feeHistory
    );
  }, [student, payments, feeHistory, effectiveAdmissionFee, effectiveMonthlyFee, batch]);

  // ── filter notes ──
  const filteredNotes = useMemo(() => {
    let result = notes;
    if (filterCategory !== "all") result = result.filter((n) => n.category === filterCategory);
    if (filterCreatedBy !== "all") result = result.filter((n) => n.created_by === filterCreatedBy);
    return result;
  }, [notes, filterCategory, filterCreatedBy]);

  const pagination = usePagination(filteredNotes, { defaultItemsPerPage: 10 });

  useEffect(() => { pagination.resetPage(); }, [filterCategory, filterCreatedBy]);

  // ── handlers ──
  const handleSaveNote = async () => {
    const trimmed = noteText.trim();
    if (!trimmed) { setNoteError("Note text is required"); return; }
    if (!studentId) return;
    setNoteError("");
    try {
      await createNote.mutateAsync({ student_id: studentId, note_text: trimmed, category: noteCategory, note_date: format(noteDate, "yyyy-MM-dd") });
      setNoteText(""); setNoteCategory("general"); setNoteDate(new Date());
      toast({ title: "Note saved" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleUpdateNote = async () => {
    if (!editingNoteId) return;
    const trimmed = editText.trim();
    if (!trimmed) return;
    try {
      await updateNote.mutateAsync({ id: editingNoteId, note_text: trimmed, category: editCategory });
      setEditingNoteId(null);
      toast({ title: "Note updated" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteId) return;
    try {
      await deleteNote.mutateAsync(deleteNoteId);
      setDeleteNoteId(null);
      toast({ title: "Note deleted" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleAddCustomCategory = async () => {
    const trimmed = newCatLabel.trim();
    if (!trimmed) return;
    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (!slug) return;
    try {
      await createCustomCategory.mutateAsync({ label: trimmed, value: slug, color_class: newCatColor });
      setNewCatLabel(""); setNewCatColor(COLOR_PRESETS[0].class); setShowAddCategory(false);
      toast({ title: "Category added" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleDeleteCustomCategory = async (id: string) => {
    try {
      await deleteCustomCategory.mutateAsync(id);
      toast({ title: "Category deleted" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const canEditNote = (note: { created_by: string }) => note.created_by === user?.id || isAdmin || isCipher;
  const canDeleteNote = (note: { created_by: string }) => note.created_by === user?.id || isAdmin || isCipher;
  const effectiveCanEdit = canEdit || canEditStudent;
  const [editOpen, setEditOpen] = useState(false);
  const [financialTab, setFinancialTab] = useState<"summary" | "course" | "products" | undefined>(undefined);
  const financialRef = useRef<HTMLDivElement>(null);
  const updateStudent = useUpdateStudent();

  const handleUpdateStudent = async (data: any) => {
    if (!student) return;
    try {
      await updateStudent.mutateAsync({ id: student.id, ...data });
      toast({ title: "Student updated successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const lastPayment = payments.length > 0 ? payments.reduce((a, b) => new Date(a.payment_date) > new Date(b.payment_date) ? a : b) : null;

  const goBack = useCallback(() => navigate("/students"), [navigate]);

  // ── Invalid UUID ──
  if (!isValidUUID) {
    return <ProfileNotFound onBack={goBack} />;
  }

  // ── Loading ──
  if (studentLoading || paymentsLoading) {
    return <ProfileSkeleton />;
  }

  // ── Not found ──
  if (!student) {
    return <ProfileNotFound onBack={goBack} />;
  }

  // ── DEO Access Gate ──
  if (isDataEntryModerator && student.user_id !== user?.id) {
    return <ProfileAccessDenied onBack={goBack} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky scroll bar */}
      <ProfileStickyBar
        visible={!isHeaderVisible}
        student={student}
        canEdit={effectiveCanEdit}
        onEdit={() => setEditOpen(true)}
      />

      <div className="max-w-[1280px] mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
        {/* Breadcrumb */}
        <ProfileBreadcrumb
          studentName={student.name}
          isLoading={false}
          onBack={goBack}
        />

        {/* Header Card */}
        <ProfileHeader
          ref={headerRef}
          student={student}
          canEdit={effectiveCanEdit}
          onEdit={() => setEditOpen(true)}
        />

        {/* Lifetime Value Hero Banner */}
        <LifetimeValueBanner studentId={student.id} student={student} totalExpected={summary?.totalExpected} />

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-7 space-y-6">
            {/* Personal Information */}
            <Card className="rounded-xl shadow-sm">
              <CardContent className="pt-6">
                <SectionHeader icon={User} title="Personal Information" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoRow label="Full Name" value={student.name} />
                  <InfoRow label="Date of Birth" value={student.date_of_birth ? format(new Date(student.date_of_birth), "MMM d, yyyy") : null} />
                  <InfoRow label="Gender" value={student.gender} />
                  <InfoRow label="Blood Group" value={student.blood_group} />
                  <InfoRow label="National ID / Birth Cert." value={canViewStudentPII ? student.aadhar_id_number : "••••••"} />
                  <InfoRow label="Religion" value={student.religion_category} />
                  <InfoRow label="Phone" value={canViewStudentPII ? student.phone : "••••••"} />
                  <InfoRow label="Email" value={canViewStudentPII ? student.email : "••••••"} />
                  <InfoRow label="WhatsApp" value={canViewStudentPII ? student.whatsapp_number : "••••••"} />
                  {canViewStudentPII && (
                    <>
                      <InfoRow label="Present Address" value={[student.address_house, student.address_street, student.address_area, student.address_city, student.address_state, student.address_pin_zip].filter(Boolean).join(", ") || null} />
                      <InfoRow label="Permanent Address" value={student.permanent_address_same ? "Same as present" : [student.perm_address_house, student.perm_address_street, student.perm_address_area, student.perm_address_city, student.perm_address_state, student.perm_address_pin_zip].filter(Boolean).join(", ") || null} />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Family / Guardian */}
            <Card className="rounded-xl shadow-sm">
              <CardContent className="pt-6">
                <SectionHeader icon={Users} title="Family / Guardian Information" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoRow label="Father's Name" value={student.father_name} />
                  <InfoRow label="Father's Occupation" value={student.father_occupation} />
                  <InfoRow label="Father's Phone" value={canViewStudentPII ? student.father_contact : "••••••"} />
                  <InfoRow label="Mother's Name" value={student.mother_name} />
                  <InfoRow label="Mother's Occupation" value={student.mother_occupation} />
                  <InfoRow label="Mother's Phone" value={canViewStudentPII ? student.mother_contact : "••••••"} />
                  <InfoRow label="Guardian Name" value={student.guardian_name} />
                  <InfoRow label="Guardian Relationship" value={student.guardian_relationship} />
                  <InfoRow label="Guardian Phone" value={canViewStudentPII ? student.guardian_contact : "••••••"} />
                  <InfoRow label="Emergency Contact" value={canViewStudentPII ? (student.emergency_contact_name ? `${student.emergency_contact_name} - ${student.emergency_contact_number}` : student.emergency_contact_number) : "••••••"} />
                </div>
              </CardContent>
            </Card>

            {/* Academic Information */}
            <Card className="rounded-xl shadow-sm">
              <CardContent className="pt-6">
                <SectionHeader icon={GraduationCap} title="Academic Information" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoRow label="Course" value={course?.course_name} />
                  <InfoRow label="Batch" value={batch?.batch_name} />
                  <InfoRow label="Class / Grade" value={student.class_grade} />
                  <InfoRow label="Roll Number" value={student.roll_number} />
                  <InfoRow label="Section / Division" value={student.section_division} />
                  <InfoRow label="Academic Year" value={student.academic_year} />
                  <InfoRow label="Enrollment Date" value={format(new Date(student.enrollment_date), "MMM d, yyyy")} />
                  <InfoRow label="Course Duration" value={batch?.course_duration_months ? `${batch.course_duration_months} months` : null} />
                  <InfoRow label="Previous Institution" value={student.previous_school} />
                  <InfoRow label="Previous Qualification" value={student.previous_qualification} />
                  <InfoRow label="Previous Percentage" value={student.previous_percentage} />
                  <InfoRow label="Board / University" value={student.board_university} />
                </div>
              </CardContent>
            </Card>

            {/* Enrollment History Timeline */}
            {activeCompanyId && (
              <EnrollmentTimeline
                studentId={student.id}
                companyId={activeCompanyId}
                onViewPayments={() => {
                  setFinancialTab("course");
                  setTimeout(() => financialRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                }}
              />
            )}

            {/* Financial Breakdown */}
            {activeCompanyId && (
              <div ref={financialRef}>
                <FinancialBreakdown studentId={student.id} companyId={activeCompanyId} initialTab={financialTab} />
              </div>
            )}

            {/* Product Purchase History */}
            {activeCompanyId && !isDataEntryModerator && (
              <ProductPurchaseHistoryWrapper studentId={student.id} companyId={activeCompanyId} fc={formatCurrency} />
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-3 space-y-6">
            <PlaceholderCard text="Quick actions panel will load here" />
            {/* Future: Quick Actions, Financial Mini, Tags, Recent Activity */}
          </div>
        </div>

        {/* BOTTOM FULL-WIDTH — Sales & Follow-up Notes */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="pt-6">
            <SectionHeader icon={MessageSquare} title="Sales & Follow-up Notes" />

            {/* Add Note Form */}
            <div className="rounded-lg border p-4 mb-6 space-y-3 bg-muted/30">
              <Textarea
                placeholder="Write a sales note, follow-up remark, or update..."
                value={noteText}
                onChange={(e) => { setNoteText(e.target.value); if (noteError) setNoteError(""); }}
                className={cn("min-h-[80px]", noteError && "border-destructive")}
              />
              {noteError && <p className="text-xs text-destructive">{noteError}</p>}
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Category</label>
                  <Select value={noteCategory} onValueChange={(v) => { if (v === "__add_custom__") { setShowAddCategory(true); } else if (v === "__manage_cats__") { setShowManageCategories(true); } else { setNoteCategory(v); } }}>
                    <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allCategories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                      {isAdmin && (
                        <>
                          <Separator className="my-1" />
                          <SelectItem value="__add_custom__"><span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Add Custom Category...</span></SelectItem>
                          {customCategories.length > 0 && (
                            <SelectItem value="__manage_cats__"><span className="flex items-center gap-1"><Pencil className="h-3 w-3" /> Manage Categories...</span></SelectItem>
                          )}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 w-[140px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {format(noteDate, "MMM d, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={noteDate} onSelect={(d) => d && setNoteDate(d)} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button onClick={handleSaveNote} disabled={createNote.isPending} className="h-9">
                  {createNote.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Save Note
                </Button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {allCategories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isDataEntryModerator && noteUserIds.length > 1 && (
                <Select value={filterCreatedBy} onValueChange={setFilterCreatedBy}>
                  <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="All Members" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {noteUserIds.map((uid) => {
                      const p = userProfileMap.get(uid);
                      return <SelectItem key={uid} value={uid}>{p?.full_name || p?.email || uid.slice(0, 8)}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              )}
              {(filterCategory !== "all" || filterCreatedBy !== "all") && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterCategory("all"); setFilterCreatedBy("all"); }}>
                  Reset Filters
                </Button>
              )}
              <span className="ml-auto text-xs text-muted-foreground">{filteredNotes.length} note{filteredNotes.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Notes List */}
            {notesLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}</div>
            ) : filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-3 rounded-full bg-muted p-4"><StickyNote className="h-8 w-8 text-muted-foreground" /></div>
                <p className="text-muted-foreground">No sales notes yet. Add the first one above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pagination.paginatedItems.map((note) => {
                  const catInfo = getCategoryInfo(note.category, customCategories);
                  const profile = userProfileMap.get(note.created_by);
                  const userInitials = (profile?.full_name || profile?.email || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
                  const isEditing = editingNoteId === note.id;

                  return (
                    <div key={note.id} className="rounded-lg border p-4 transition-all hover:shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={cn("text-xs", catInfo.color)}>{catInfo.label}</Badge>
                          <span className="text-xs text-muted-foreground">{format(new Date(note.note_date), "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {canEditNote(note) && !isEditing && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingNoteId(note.id); setEditText(note.note_text); setEditCategory(note.category); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDeleteNote(note) && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteNoteId(note.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="min-h-[60px]" />
                          <div className="flex gap-2 items-center">
                            <Select value={editCategory} onValueChange={setEditCategory}>
                              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {allCategories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button size="sm" className="h-8" onClick={handleUpdateNote} disabled={updateNote.isPending}>
                              {updateNote.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />} Save
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingNoteId(null)}>
                              <X className="mr-1 h-3.5 w-3.5" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm whitespace-pre-wrap">{note.note_text}</p>
                      )}

                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px] bg-muted">{userInitials}</AvatarFallback>
                        </Avatar>
                        <span>{profile?.full_name || profile?.email || "Unknown"}</span>
                        <span>·</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-default">{formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</span>
                          </TooltipTrigger>
                          <TooltipContent>{format(new Date(note.created_at), "PPpp")}</TooltipContent>
                        </Tooltip>
                        {note.updated_at !== note.created_at && (
                          <>
                            <span>·</span>
                            <span className="italic">edited</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <span className="text-xs text-muted-foreground">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8" disabled={!pagination.canGoPrev} onClick={pagination.prevPage}>
                        <ChevronLeft className="h-4 w-4" /> Previous
                      </Button>
                      <Button variant="outline" size="sm" className="h-8" disabled={!pagination.canGoNext} onClick={pagination.nextPage}>
                        Next <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Future: Full Activity Timeline */}
      </div>

      {/* Delete Note Confirmation */}
      <AlertDialog open={!!deleteNoteId} onOpenChange={(o) => !o && setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNote} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteNote.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Custom Category Dialog */}
      <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Custom Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Category Name</label>
              <Input placeholder="e.g. Site Visit" value={newCatLabel} onChange={(e) => setNewCatLabel(e.target.value)} maxLength={30} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button key={preset.name} type="button" className={cn("rounded-full px-3 py-1 text-xs font-medium transition-all", preset.class, newCatColor === preset.class ? "ring-2 ring-primary ring-offset-2" : "opacity-70 hover:opacity-100")} onClick={() => setNewCatColor(preset.class)}>
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Preview</label>
              <div className="mt-1"><Badge className={cn("text-xs", newCatColor)}>{newCatLabel || "Category Name"}</Badge></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCategory(false)}>Cancel</Button>
            <Button onClick={handleAddCustomCategory} disabled={!newCatLabel.trim() || createCustomCategory.isPending}>
              {createCustomCategory.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Custom Categories Dialog */}
      <Dialog open={showManageCategories} onOpenChange={setShowManageCategories}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Manage Custom Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {customCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No custom categories yet.</p>
            ) : (
              customCategories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Badge className={cn("text-xs", cat.color_class)}>{cat.label}</Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={() => handleDeleteCustomCategory(cat.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManageCategories(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Student Wizard Dialog */}
      <StudentWizardDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        student={student}
        onSave={handleUpdateStudent}
      />
    </div>
  );
}
