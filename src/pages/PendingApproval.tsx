import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useRegistrationStatus } from "@/hooks/useRegistrationStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, LogOut } from "lucide-react";

export default function PendingApproval() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { status, refetch } = useRegistrationStatus();

  // Poll every 3 seconds to check if approved
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Redirect to dashboard if approved
  useEffect(() => {
    if (status === "has_role" || status === "approved") {
      navigate("/", { replace: true });
    }
    // If rejected, send back to auth page where rejection message will show on next login
    if (status === "rejected") {
      supabase.auth.signOut({ scope: "local" }).then(() => {
        navigate("/auth", { replace: true });
      });
    }
  }, [status, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut({ scope: "local" });
    navigate("/auth", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">KhataFlow</CardTitle>
          <CardDescription className="mt-2">Registration Pending</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-muted/50 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Awaiting Approval</h3>
              <p className="text-sm text-muted-foreground">
                Your account registration is pending approval from an administrator. 
                You will be automatically redirected once your account is approved.
              </p>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            This page will automatically refresh to check your status.
          </div>

          <Button 
            variant="outline" 
            className="w-full gap-2" 
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
