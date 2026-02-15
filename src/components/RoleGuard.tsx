import { type ReactNode } from "react";
import { useRole } from "@/contexts/RoleContext";
import { useCompany } from "@/contexts/CompanyContext";
import type { AppRole } from "@/hooks/useUserRole";

interface RoleGuardProps {
  children: ReactNode;
  roles?: AppRole[];
  minRole?: AppRole;
  fallback?: ReactNode;
  showLoading?: boolean;
}

export function RoleGuard({ 
  children, 
  roles, 
  minRole, 
  fallback = null,
  showLoading = false,
}: RoleGuardProps) {
  const { role, isLoading, hasRoleLevel, hasNoRole } = useRole();

  if (isLoading && showLoading) {
    return <div className="animate-pulse h-8 bg-muted rounded" />;
  }

  if (isLoading) return null;

  if (hasNoRole) return <>{fallback}</>;

  if (roles && role && !roles.includes(role)) return <>{fallback}</>;

  if (minRole && !hasRoleLevel(minRole)) return <>{fallback}</>;

  return <>{children}</>;
}

interface PermissionGuardProps {
  children: ReactNode;
  permission: "canAddRevenue" | "canAddExpense" | "canAddExpenseSource" | "canTransfer" | "canViewReports" | "canEdit" | "canDelete" | "canManageMembers" | "canManageStudents";
  fallback?: ReactNode;
}

export function PermissionGuard({ children, permission, fallback = null }: PermissionGuardProps) {
  const companyContext = useCompany();
  const hasPermission = companyContext[permission as keyof typeof companyContext];

  if (!hasPermission) return <>{fallback}</>;

  return <>{children}</>;
}
