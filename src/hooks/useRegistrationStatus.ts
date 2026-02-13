import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type RegistrationStatus = "pending" | "approved" | "rejected" | "has_role" | "loading" | "error";

interface RegistrationStatusResult {
  status: RegistrationStatus;
  isLoading: boolean;
  rejectionReason: string | null;
  refetch: () => Promise<void>;
}

export function useRegistrationStatus(): RegistrationStatusResult {
  const { user } = useAuth();
  const [status, setStatus] = useState<RegistrationStatus>("loading");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!user) {
      setStatus("loading");
      return;
    }

    try {
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

      if (roleData) {
        setStatus("has_role");
        return;
      }

      const { data: requestData, error: requestError } = await supabase
        .from("registration_requests")
        .select("status, rejection_reason")
        .eq("user_id", user.id)
        .maybeSingle();

      if (requestError) {
        console.error("Error checking registration request:", requestError);
        setStatus("error");
        return;
      }

      if (requestData) {
        if (requestData.status === "rejected") {
          setRejectionReason(requestData.rejection_reason);
          setStatus("rejected");
        } else {
          setStatus(requestData.status as RegistrationStatus);
        }
      } else {
        setStatus("has_role");
      }
    } catch (err) {
      console.error("Unexpected error checking status:", err);
      setStatus("error");
    }
  }, [user]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Realtime: registration_requests updates (reject/approve)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("reg-status-" + user.id)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "registration_requests",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          checkStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, checkStatus]);

  // Realtime: user_roles insert (approval creates role)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("role-insert-" + user.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_roles",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          checkStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, checkStatus]);

  return {
    status,
    isLoading: status === "loading",
    rejectionReason,
    refetch: checkStatus,
  };
}
