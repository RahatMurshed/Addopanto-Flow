import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "cipher" | "admin" | "moderator" | "user";

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
    queryFn: async (): Promise<AppRole> => {
      if (!user?.id) return "user";

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        return "user";
      }

      // Sort by role priority and return highest
      return (data?.role as AppRole) ?? "user";
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const role = userRole ?? "user";

  return {
    role,
    isLoading,
    error,
    refetch,
    // Helper functions
    isCipher: role === "cipher",
    isAdmin: role === "admin" || role === "cipher",
    isModerator: role === "moderator",
    isUser: role === "user",
    // Check if user has at least the given role level
    hasRoleLevel: (requiredRole: AppRole): boolean => {
      const roleHierarchy: Record<AppRole, number> = {
        cipher: 4,
        admin: 3,
        moderator: 2,
        user: 1,
      };
      return roleHierarchy[role] >= roleHierarchy[requiredRole];
    },
    // Check if current user can manage target role
    canManageRole: (targetRole: AppRole): boolean => {
      if (role === "cipher") return true;
      if (role === "admin" && targetRole !== "cipher") return true;
      return false;
    },
  };
}
