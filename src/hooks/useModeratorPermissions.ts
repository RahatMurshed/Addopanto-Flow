import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/utils/logger";
import { useToast } from "@/hooks/use-toast";

export interface ModeratorPermissions {
  id: string;
  user_id: string;
  can_add_revenue: boolean;
  can_add_expense: boolean;
  can_add_expense_source: boolean;
  can_transfer: boolean;
  can_view_reports: boolean;
  controlled_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useModeratorPermissions(targetUserId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = targetUserId ?? user?.id;

  const { data: permissions, isLoading, error, refetch } = useQuery({
    queryKey: ["moderator-permissions", userId],
    queryFn: async (): Promise<ModeratorPermissions | null> => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("moderator_permissions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        logger.error("Error fetching moderator permissions:", error);
        return null;
      }

      return data as ModeratorPermissions | null;
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds for faster sync
    refetchOnWindowFocus: true,
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async (updates: Partial<Pick<ModeratorPermissions, "can_add_revenue" | "can_add_expense" | "can_add_expense_source" | "can_transfer" | "can_view_reports">>) => {
      if (!userId) throw new Error("No user ID");

      // Check if permissions exist
      const { data: existing } = await supabase
        .from("moderator_permissions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("moderator_permissions")
          .update(updates)
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("moderator_permissions")
          .insert({
            user_id: userId,
            controlled_by: user?.id,
            ...updates,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      // Invalidate this user's permissions and all moderator-permissions queries
      queryClient.invalidateQueries({ queryKey: ["moderator-permissions", userId] });
      queryClient.invalidateQueries({ queryKey: ["moderator-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["moderators"] });
      toast({ title: "Permissions updated" });
    },
    onError: (error) => {
      toast({ title: "Failed to update permissions", description: error.message, variant: "destructive" });
    },
  });

  return {
    permissions,
    isLoading,
    error,
    refetch,
    updatePermissions: updatePermissionsMutation.mutate,
    isUpdating: updatePermissionsMutation.isPending,
    // Helper functions for current user
    canAddRevenue: permissions?.can_add_revenue ?? false,
    canAddExpense: permissions?.can_add_expense ?? false,
    canAddExpenseSource: permissions?.can_add_expense_source ?? false,
    canTransfer: permissions?.can_transfer ?? false,
    canViewReports: permissions?.can_view_reports ?? false,
  };
}
