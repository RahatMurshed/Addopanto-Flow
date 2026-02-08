import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";

export function usePendingRequestsCount() {
  const { isAdmin, isCipher } = useRole();
  const canView = isAdmin || isCipher;

  const { data: count = 0 } = useQuery({
    queryKey: ["pending-requests-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("registration_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (error) throw error;
      return count ?? 0;
    },
    enabled: canView,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return canView ? count : 0;
}
