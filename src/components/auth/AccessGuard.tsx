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
  /** Block moderators with no revenue permissions */
  deoRevenue: {
    isDenied: (ctx) => ctx.isModerator && !ctx.canAddRevenue && !ctx.canViewRevenue,
    message: "You don't have permission to access revenue data. Contact your company admin to request revenue access.",
  },
  /** Block moderators with no student permissions */
  deoStudents: {
    isDenied: (ctx) => ctx.isModerator && !ctx.canAddStudent && !ctx.canEditStudent && !ctx.canDeleteStudent,
    message: "You don't have permission to access student data. Contact your company admin to request student access.",
  },
  /** Block moderators with no batch/course permissions */
  deoCourses: {
    isDenied: (ctx) => ctx.isModerator && !ctx.canAddBatch && !ctx.canEditBatch && !ctx.canDeleteBatch,
    message: "You don't have permission to access courses or batches. Contact your company admin to request access.",
  },
  /** Block all moderators from member management */
  deoMembers: {
    isDenied: (ctx) => ctx.isModerator,
    message: "You don't have permission to manage company members. Contact your company admin for assistance.",
    autoRedirectSeconds: 5,
  },
} satisfies Record<string, AccessRule>;

interface AccessGuardProps {
  children: ReactNode;
  rules: AccessRule[];
}

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
