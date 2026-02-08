import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type RegistrationStatus = "pending" | "approved" | "rejected" | "has_role" | "loading" | "error";

interface RegistrationStatusResult {
  status: RegistrationStatus;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useRegistrationStatus(): RegistrationStatusResult {
  const { user } = useAuth();
  const [status, setStatus] = useState<RegistrationStatus>("loading");

  const checkStatus = async () => {
    if (!user) {
      setStatus("loading");
      return;
    }

    try {
      // First check if user has a role (approved users)
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleError) {
        console.error("Error checking role:", roleError);
        setStatus("error");
        return;
      }

      // If user has a role, they're approved
      if (roleData) {
        setStatus("has_role");
        return;
      }

      // No role - check registration request status
      const { data: requestData, error: requestError } = await supabase
        .from("registration_requests")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (requestError) {
        console.error("Error checking registration request:", requestError);
        setStatus("error");
        return;
      }

      if (requestData) {
        setStatus(requestData.status as RegistrationStatus);
      } else {
        // No role and no request - this is a legacy user from before the approval feature
        // Grant them access as if they have a role
        setStatus("has_role");
      }
    } catch (err) {
      console.error("Unexpected error checking status:", err);
      setStatus("error");
    }
  };

  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return {
    status,
    isLoading: status === "loading",
    refetch: checkStatus,
  };
}
