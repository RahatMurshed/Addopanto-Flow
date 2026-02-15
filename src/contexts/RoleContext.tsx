import { createContext, useContext, type ReactNode } from "react";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";

interface RoleContextType {
  role: AppRole | null;
  isLoading: boolean;
  isCipher: boolean;
  isUser: boolean;
  hasNoRole: boolean;
  hasRoleLevel: (requiredRole: AppRole) => boolean;
  canManageRole: (targetRole: AppRole) => boolean;
  refetchRole: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const {
    role,
    isLoading,
    isCipher,
    isUser,
    hasNoRole,
    hasRoleLevel,
    canManageRole,
    refetch: refetchRole,
  } = useUserRole();

  return (
    <RoleContext.Provider
      value={{
        role,
        isLoading,
        isCipher,
        isUser,
        hasNoRole,
        hasRoleLevel,
        canManageRole,
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
