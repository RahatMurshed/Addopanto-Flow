import { type ReactNode } from "react";
import { useRole } from "@/contexts/RoleContext";
import type { AppRole } from "@/hooks/useUserRole";

interface RoleGuardProps {
  children: ReactNode;
  /** Roles that are allowed to see this content */
  roles?: AppRole[];
  /** Minimum role level required (uses hierarchy: cipher > admin > moderator > user) */
  minRole?: AppRole;
  /** Show a fallback component if not authorized */
  fallback?: ReactNode;
  /** If true, shows loading skeleton while checking role */
  showLoading?: boolean;
}

/**
 * RoleGuard - Conditionally renders children based on user role
 * 
 * Usage:
 * - <RoleGuard roles={['admin', 'cipher']}>Admin-only content</RoleGuard>
 * - <RoleGuard minRole="moderator">Moderator+ content</RoleGuard>
 */
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

  if (isLoading) {
    return null;
  }

  // Block all access if user has no role (pending)
  if (hasNoRole) {
    return <>{fallback}</>;
  }

  // Check if role is in allowed list
  if (roles && role && !roles.includes(role)) {
    return <>{fallback}</>;
  }

  // Check if role meets minimum level
  if (minRole && !hasRoleLevel(minRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * PermissionGuard - Conditionally renders based on specific permissions
 */
interface PermissionGuardProps {
  children: ReactNode;
  permission: "canAddRevenue" | "canAddExpense" | "canViewReports" | "canEdit" | "canDelete" | "canManageUsers";
  fallback?: ReactNode;
}

export function PermissionGuard({ children, permission, fallback = null }: PermissionGuardProps) {
  const roleContext = useRole();
  const hasPermission = roleContext[permission];

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
