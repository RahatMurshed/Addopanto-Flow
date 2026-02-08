import { createContext, useContext, type ReactNode } from "react";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";
import { useModeratorPermissions, type ModeratorPermissions } from "@/hooks/useModeratorPermissions";

interface RoleContextType {
  role: AppRole;
  isLoading: boolean;
  isCipher: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isUser: boolean;
  hasRoleLevel: (requiredRole: AppRole) => boolean;
  canManageRole: (targetRole: AppRole) => boolean;
  // Moderator permissions
  moderatorPermissions: ModeratorPermissions | null;
  canAddRevenue: boolean;
  canAddExpense: boolean;
  canViewReports: boolean;
  // Computed permissions based on role
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  refetchRole: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const {
    role,
    isLoading: roleLoading,
    isCipher,
    isAdmin,
    isModerator,
    isUser,
    hasRoleLevel,
    canManageRole,
    refetch: refetchRole,
  } = useUserRole();

  const {
    permissions: moderatorPermissions,
    isLoading: permissionsLoading,
    canAddRevenue: modCanAddRevenue,
    canAddExpense: modCanAddExpense,
    canViewReports: modCanViewReports,
  } = useModeratorPermissions();

  const isLoading = roleLoading || permissionsLoading;

  // Compute permissions based on role
  // Cipher and Admin can do everything
  // Moderator has limited add-only permissions
  // User can only manage their own data (handled by RLS)
  const canAddRevenue = isCipher || isAdmin || (isModerator && modCanAddRevenue) || isUser;
  const canAddExpense = isCipher || isAdmin || (isModerator && modCanAddExpense) || isUser;
  const canViewReports = isCipher || isAdmin || (isModerator && modCanViewReports) || isUser;
  
  // Edit/Delete: Only Cipher, Admin, and regular Users (for their own data)
  // Moderators cannot edit or delete
  const canEdit = isCipher || isAdmin || isUser;
  const canDelete = isCipher || isAdmin || isUser;
  
  // User management: Only Cipher and Admin
  const canManageUsers = isCipher || isAdmin;

  return (
    <RoleContext.Provider
      value={{
        role,
        isLoading,
        isCipher,
        isAdmin,
        isModerator,
        isUser,
        hasRoleLevel,
        canManageRole,
        moderatorPermissions,
        canAddRevenue,
        canAddExpense,
        canViewReports,
        canEdit,
        canDelete,
        canManageUsers,
        refetchRole,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within RoleProvider");
  }
  return context;
}
