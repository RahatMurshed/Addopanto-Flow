import { type ReactNode } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { PermissionDenied } from "@/components/auth/PermissionDenied";

interface AccessRule {
  /** Return true to BLOCK access */
  isDenied: (ctx: ReturnType<typeof useCompany>) => boolean;
  message: string;
  autoRedirectSeconds?: number;
}

export const ACCESS_RULES = {
  /** Block all moderators from Dashboard (admin/cipher only) */
  moderatorDashboard: {
    isDenied: (ctx) => ctx.isModerator,
    message: "Access Denied — Admin Only. The Dashboard is restricted to admins.",
    autoRedirectSeconds: 5,
  },
  /** Block all moderators from Reports (admin/cipher only) */
  moderatorReports: {
    isDenied: (ctx) => ctx.isModerator,
    message: "Access Denied — Admin Only. Reports are restricted to admins.",
    autoRedirectSeconds: 5,
  },
  /** Block moderators without revenue view access */
  deoRevenue: {
    isDenied: (ctx) => ctx.isModerator && !ctx.canViewRevenue,
    message: "You don't have permission to access revenue data. Contact your company admin to request revenue access.",
  },
  /** Block moderators with no student permissions */
  deoStudents: {
    isDenied: (ctx) => ctx.isModerator && !ctx.canAddStudent && !ctx.canEditStudent && !ctx.canDeleteStudent,
    message: "You don't have permission to access student data. Contact your company admin to request student access.",
  },
  /** Block moderators without course view access */
  deoCourses: {
    isDenied: (ctx) => ctx.isModerator && !ctx.canViewCourses,
    message: "You don't have permission to access courses. Contact your company admin to request access.",
  },
  /** Block DEO moderators from courses page */
  deoCoursePages: {
    isDenied: (ctx) => ctx.isDataEntryModerator,
    message: "Access Denied. Courses are not available in Data Entry Mode.",
    autoRedirectSeconds: 5,
  },
  /** Block moderators without batch view access */
  deoBatchPages: {
    isDenied: (ctx) => ctx.isModerator && !ctx.canViewBatches,
    message: "You don't have permission to access batches. Contact your company admin to request access.",
    autoRedirectSeconds: 5,
  },
  /** Block moderators without revenue view */
  deoRevenuePages: {
    isDenied: (ctx) => ctx.isDataEntryModerator,
    message: "Access Denied. Revenue is not available in Data Entry Mode.",
    autoRedirectSeconds: 5,
  },
  /** Block DEO moderators from payments */
  deoPaymentPages: {
    isDenied: (ctx) => ctx.isDataEntryModerator,
    message: "Access Denied. Payments are not available in Data Entry Mode.",
    autoRedirectSeconds: 5,
  },
  /** Block all moderators from member management */
  deoMembers: {
    isDenied: (ctx) => ctx.isModerator,
    message: "You don't have permission to manage company members. Contact your company admin for assistance.",
    autoRedirectSeconds: 5,
  },
  /** Block all moderators from duplicate detection */
  moderatorDuplicates: {
    isDenied: (ctx) => ctx.isModerator,
    message: "Access Denied — Admin Only. Duplicate detection is restricted to admins.",
    autoRedirectSeconds: 5,
  },
  /** Block moderators without employee view permission */
  deoEmployees: {
    isDenied: (ctx) => ctx.isModerator && !ctx.canViewEmployees,
    message: "You don't have permission to access employee data. Contact your company admin to request employee access.",
    autoRedirectSeconds: 5,
  },
  /** Block moderators without expense view access */
  deoExpenses: {
    isDenied: (ctx) => ctx.isModerator && !ctx.canViewExpense && !ctx.canAddExpense,
    message: "You don't have permission to access expenses. Contact your company admin to request access.",
    autoRedirectSeconds: 5,
  },
  /** Block DEO moderators from Products */
  deoProducts: {
    isDenied: (ctx) => ctx.isDataEntryModerator,
    message: "Access Denied. Products are not available in Data Entry Mode.",
    autoRedirectSeconds: 5,
  },
} satisfies Record<string, AccessRule>;

interface AccessGuardProps {
  children: ReactNode;
  rules: AccessRule[];
}

export function AccessGuard({ children, rules }: AccessGuardProps) {
  const ctx = useCompany();

  // Block all rendering until role/permission data resolves
  if (ctx.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  for (const rule of rules) {
    if (rule.isDenied(ctx)) {
      return (
        <PermissionDenied
          message={rule.message}
          autoRedirectSeconds={rule.autoRedirectSeconds}
        />
      );
    }
  }

  return <>{children}</>;
}