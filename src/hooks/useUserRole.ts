import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "cipher" | "user";

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  assigned_by: string | null;
}

export function useUserRole() {
  const { user } = useAuth();

  const { data: userRole, isLoading, error, refetch } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async (): Promise<AppRole | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }

      // Map any legacy roles to "user"
      const rawRole = data?.role as string | undefined;
      if (rawRole === "cipher") return "cipher";
      if (rawRole) return "user";
      return null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const role = userRole ?? null;
  const hasNoRole = role === null;

  return {
    role,
    isLoading,
    error,
    refetch,
    hasNoRole,
    isCipher: role === "cipher",
    isUser: role === "user",
    hasRoleLevel: (requiredRole: AppRole): boolean => {
      if (hasNoRole) return false;
      const roleHierarchy: Record<AppRole, number> = {
        cipher: 2,
        user: 1,
      };
      return roleHierarchy[role!] >= roleHierarchy[requiredRole];
    },
    canManageRole: (targetRole: AppRole): boolean => {
      if (hasNoRole) return false;
      if (role === "cipher") return true;
      return false;
    },
  };
}
