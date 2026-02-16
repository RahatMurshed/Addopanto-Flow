import { type ReactNode } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { PermissionDenied } from "@/components/auth/PermissionDenied";

/**
 * Centralized route access configuration.
 * Each entry maps a check function (using company context) to a denied message.
 * If the check returns true, access is denied.
 */
interface AccessRule {
  /** Return true to BLOCK access */
  isDenied: (ctx: ReturnType<typeof useCompany>) => boolean;
  message: string;
  /** Auto-redirect to dashboard after N seconds (optional) */
  autoRedirectSeconds?: number;
}

/**
 * Predefined access rules for common patterns.
 */
export const ACCESS_RULES = {
  /** Block DEOs with no revenue permissions */
  deoRevenue: {
    isDenied: (ctx) => ctx.isDataEntryOperator && !ctx.canAddRevenue && !ctx.canViewRevenue,
    message: "You don't have permission to access revenue data. Contact your company admin to request revenue access.",
  },
  /** Block DEOs with no student permissions */
  deoStudents: {
    isDenied: (ctx) => ctx.isDataEntryOperator && !ctx.canAddStudent && !ctx.canEditStudent && !ctx.canDeleteStudent,
    message: "You don't have permission to access student data. Contact your company admin to request student access.",
  },
  /** Block DEOs with no batch/course permissions */
  deoCourses: {
    isDenied: (ctx) => ctx.isDataEntryOperator && !ctx.canAddBatch && !ctx.canEditBatch && !ctx.canDeleteBatch,
    message: "You don't have permission to access courses or batches. Contact your company admin to request access.",
  },
  /** Block all DEOs from member management */
  deoMembers: {
    isDenied: (ctx) => ctx.isDataEntryOperator,
    message: "You don't have permission to manage company members. Contact your company admin for assistance.",
    autoRedirectSeconds: 5,
  },
} satisfies Record<string, AccessRule>;

interface AccessGuardProps {
  children: ReactNode;
  /** One or more access rules to evaluate. If ANY rule blocks, access is denied. */
  rules: AccessRule[];
}

/**
 * Centralized access guard component.
 * Wraps route content and checks access rules against company context.
 * Shows PermissionDenied with optional auto-redirect when blocked.
 *
 * Usage in App.tsx:
 * ```
 * <AccessGuard rules={[ACCESS_RULES.deoRevenue]}>
 *   <Revenue />
 * </AccessGuard>
 * ```
 */
export function AccessGuard({ children, rules }: AccessGuardProps) {
  const ctx = useCompany();

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
