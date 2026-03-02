import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { useCompany } from "@/contexts/CompanyContext";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, AlertCircle, Lock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

import { FinancialSummaryTab } from "./FinancialSummaryTab";
import { CoursePaymentsTab, type CoursePaymentRow } from "./CoursePaymentsTab";
import { ProductPurchasesTab, type ProductPurchaseRow } from "./ProductPurchasesTab";

interface FinancialBreakdownProps {
  studentId: string;
  initialTab?: TabId;
  companyId: string;
}

type TabId = "summary" | "course" | "products";

const TABS: { id: TabId; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "course", label: "Course Payments" },
  { id: "products", label: "Product Purchases" },
];

function RestrictedCard({ title, message }: { title: string; message: string }) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="pt-6 pb-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-6 rounded-full bg-primary" />
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-primary">{title}</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 rounded-full bg-muted p-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FinancialSkeleton() {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-6 rounded-full bg-primary" />
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <div className="flex justify-center">
          <Skeleton className="w-48 h-48 rounded-full" />
        </div>
        <div className="flex justify-center gap-6 mt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-32 rounded" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function FinancialBreakdown({ studentId, companyId, initialTab }: FinancialBreakdownProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab ?? "summary");
  useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);
  const { fc } = useCompanyCurrency();
  const { isDataEntryModerator, isCompanyAdmin, canViewFinancialData } = useCompany();
  const { isCipher } = useRole();
  const isAdmin = isCompanyAdmin || isCipher;

  // Determine visibility flags (before hooks, used to control enabled)
  const isDEO = isDataEntryModerator;
  const isRestricted = canViewFinancialData === false;
  const shouldFetch = !isDEO && !isRestricted;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["financial-breakdown", studentId, companyId],
    queryFn: async () => {
      const { data: payments, error: e1 } = await supabase
        .from("student_payments")
        .select("id, amount, status, payment_date, payment_method, due_date, payment_type, user_id, batch_enrollment_id")
        .eq("student_id", studentId)
        .eq("company_id", companyId)
        .order("payment_date", { ascending: false });
      if (e1) throw e1;

      const { data: enrollments, error: e2 } = await supabase
        .from("batch_enrollments")
        .select(`
          id,
          batches!batch_enrollments_batch_id_fkey (
            batch_name,
            courses!batches_course_id_fkey (
              course_name
            )
          )
        `)
        .eq("student_id", studentId)
        .eq("company_id", companyId);
      if (e2) throw e2;

      const { data: sales, error: e3 } = await supabase
        .from("product_sales")
        .select("id, quantity, unit_price, total_amount, sale_date, payment_method, user_id, product_id")
        .eq("student_id", studentId)
        .eq("company_id", companyId)
        .order("sale_date", { ascending: false });
      if (e3) throw e3;

      const productIds = [...new Set((sales ?? []).map((s) => s.product_id))];
      const productMap = new Map<string, { name: string; category: string }>();
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from("products")
          .select("id, product_name, category")
          .in("id", productIds);
        (products ?? []).forEach((p: any) => {
          productMap.set(p.id, { name: p.product_name, category: p.category ?? "General" });
        });
      }

      const userIds = [...new Set([
        ...(payments ?? []).map((p) => p.user_id),
        ...(sales ?? []).map((s) => s.user_id),
      ])];
      const userMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);
        (profiles ?? []).forEach((p: any) => {
          userMap.set(p.user_id, p.full_name || p.email || "Unknown");
        });
      }

      const enrollmentMap = new Map<string, { batchName: string; courseName: string }>();
      (enrollments ?? []).forEach((e: any) => {
        const batch = e.batches;
        enrollmentMap.set(e.id, {
          batchName: batch?.batch_name ?? "Unknown Batch",
          courseName: batch?.courses?.course_name ?? "Uncategorized",
        });
      });

      const { data: futureUnpaid } = await supabase
        .from("student_payments")
        .select("amount")
        .eq("student_id", studentId)
        .eq("company_id", companyId)
        .in("status", ["unpaid", "partial"])
        .gt("due_date", new Date().toISOString());

      const revenueProjection = (futureUnpaid ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

      return {
        payments: payments ?? [],
        sales: sales ?? [],
        enrollmentMap,
        productMap,
        userMap,
        revenueProjection,
      };
    },
    enabled: shouldFetch && !!studentId && !!companyId,
  });

  const coursePayments: CoursePaymentRow[] = useMemo(() => {
    if (!data) return [];
    // Only use fallback for single-enrollment students to avoid misattribution
    const fallbackEnrollment = data.enrollmentMap.size === 1
      ? data.enrollmentMap.values().next().value
      : null;
    return data.payments.map((p) => {
      const enrollment = p.batch_enrollment_id
        ? data.enrollmentMap.get(p.batch_enrollment_id)
        : fallbackEnrollment;
      return {
        id: p.id,
        amount: Number(p.amount),
        status: p.status,
        payment_date: p.payment_date,
        payment_method: p.payment_method,
        due_date: p.due_date,
        payment_type: p.payment_type,
        user_id: p.user_id,
        courseName: enrollment?.courseName ?? (data.enrollmentMap.size > 1 ? "Unlinked (pre-tracking)" : "Uncategorized"),
        batchName: enrollment?.batchName ?? (data.enrollmentMap.size > 1 ? "Unlinked (pre-tracking)" : "No Batch"),
        batch_enrollment_id: p.batch_enrollment_id ?? null,
      };
    });
  }, [data]);

  const productPurchases: ProductPurchaseRow[] = useMemo(() => {
    if (!data) return [];
    return data.sales.map((s) => {
      const product = data.productMap.get(s.product_id);
      return {
        id: s.id,
        quantity: s.quantity,
        unit_price: Number(s.unit_price),
        total_amount: Number(s.total_amount),
        sale_date: s.sale_date,
        payment_method: s.payment_method,
        payment_status: (s as any).payment_status ?? "paid",
        user_id: s.user_id,
        productName: product?.name ?? "Unknown Product",
        category: product?.category ?? "General",
      };
    });
  }, [data]);

  const summaryData = useMemo(() => {
    // Exclude cancelled payments from financial totals
    const activeCoursePayments = coursePayments.filter((p) => p.status !== "cancelled");
    const totalCourseFee = activeCoursePayments.reduce((sum, p) => sum + p.amount, 0);
    const totalCoursePaid = activeCoursePayments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);
    const totalCourseOutstanding = Math.max(0, totalCourseFee - totalCoursePaid);
    const totalProductsSpent = productPurchases.reduce((sum, p) => sum + p.total_amount, 0);
    const totalInvoiced = totalCourseFee + totalProductsSpent;
    const totalPaid = totalCoursePaid + totalProductsSpent;
    const totalOutstanding = totalCourseOutstanding;

    const lastPaid = activeCoursePayments
      .filter((p) => p.status === "paid")
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0];

    return {
      totalCourseFee,
      totalCoursePaid,
      totalCourseOutstanding,
      totalProductsSpent,
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      lastPaymentDate: lastPaid?.payment_date ?? null,
      lastPaymentAmount: lastPaid?.amount ?? 0,
      revenueProjection: data?.revenueProjection ?? 0,
    };
  }, [coursePayments, productPurchases, data?.revenueProjection]);

  // ── Early returns after all hooks ──

  if (isDEO) return null;

  if (isRestricted) {
    return (
      <RestrictedCard
        title="Financial Overview"
        message="You don't have permission to view payment details."
      />
    );
  }

  if (isLoading) return <FinancialSkeleton />;

  if (error) {
    return (
      <Card className="rounded-xl shadow-sm">
        <CardContent className="pt-6 pb-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 rounded-full bg-primary" />
            <DollarSign className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-primary">Financial Overview</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Could not load financial data</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
              <RefreshCw className="mr-2 h-4 w-4" /> Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl shadow-sm overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 rounded-full bg-primary" />
            <DollarSign className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-primary">Financial Overview</h2>
          </div>

          {/* Tab bar */}
          <div className="flex gap-0 border-b border-border">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium transition-colors relative",
                  activeTab === tab.id
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === "summary" && (
            <FinancialSummaryTab data={summaryData} fc={fc} />
          )}
          {activeTab === "course" && (
            <CoursePaymentsTab
              payments={coursePayments}
              userMap={data?.userMap ?? new Map()}
              fc={fc}
              isAdmin={isAdmin}
            />
          )}
          {activeTab === "products" && (
            <ProductPurchasesTab
              purchases={productPurchases}
              userMap={data?.userMap ?? new Map()}
              fc={fc}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
