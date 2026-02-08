import { createContext, useContext, type ReactNode } from "react";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";
import { useModeratorPermissions, type ModeratorPermissions } from "@/hooks/useModeratorPermissions";

interface RoleContextType {
  role: AppRole | null;
  isLoading: boolean;
  isCipher: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isUser: boolean;
  hasNoRole: boolean;
  hasRoleLevel: (requiredRole: AppRole) => boolean;
  canManageRole: (targetRole: AppRole) => boolean;
  // Moderator permissions
  moderatorPermissions: ModeratorPermissions | null;
  canAddRevenue: boolean;
  canAddExpense: boolean;
  canAddExpenseSource: boolean;
  canTransfer: boolean;
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
    hasNoRole,
    hasRoleLevel,
    canManageRole,
    refetch: refetchRole,
  } = useUserRole();

  const {
    permissions: moderatorPermissions,
    isLoading: permissionsLoading,
    canAddRevenue: modCanAddRevenue,
    canAddExpense: modCanAddExpense,
    canAddExpenseSource: modCanAddExpenseSource,
    canTransfer: modCanTransfer,
    canViewReports: modCanViewReports,
  } = useModeratorPermissions();

  const isLoading = roleLoading || permissionsLoading;

  // Compute permissions based on role
  // Cipher and Admin can do everything
  // Moderator has limited add-only permissions (only if granted)
  // Pending users (hasNoRole) have NO permissions
  const canAddRevenue = isCipher || isAdmin || (isModerator && modCanAddRevenue);
  const canAddExpense = isCipher || isAdmin || (isModerator && modCanAddExpense);
  const canAddExpenseSource = isCipher || isAdmin || (isModerator && modCanAddExpenseSource);
  const canTransfer = isCipher || isAdmin || (isModerator && modCanTransfer);
  const canViewReports = isCipher || isAdmin || (isModerator && modCanViewReports);
  
  // Edit/Delete: Only Cipher and Admin
  // Moderators cannot edit or delete
  const canEdit = isCipher || isAdmin;
  const canDelete = isCipher || isAdmin;
  
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
        hasNoRole,
        hasRoleLevel,
        canManageRole,
        moderatorPermissions,
        canAddRevenue,
        canAddExpense,
        canAddExpenseSource,
        canTransfer,
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
