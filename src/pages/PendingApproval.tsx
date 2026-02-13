import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useRegistrationStatus } from "@/hooks/useRegistrationStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, LogOut, XCircle } from "lucide-react";

export default function PendingApproval() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { status, rejectionReason, refetch } = useRegistrationStatus();
  const [rejectedLocked, setRejectedLocked] = useState(false);
  const [lockedReason, setLockedReason] = useState<string | null>(null);

  // Latch rejection state so it survives signOut clearing the user
  useEffect(() => {
    if (status === "rejected" && !rejectedLocked) {
      setRejectedLocked(true);
      setLockedReason(rejectionReason);
    }
  }, [status, rejectionReason, rejectedLocked]);

  // Poll every 3 seconds to check if approved
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Redirect to dashboard if approved (works even from rejection screen if admin re-approves)
  useEffect(() => {
    if (status === "has_role" || status === "approved") {
      setRejectedLocked(false);
      navigate("/", { replace: true });
    }
  }, [status, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut({ scope: "local" });
    navigate("/auth", { replace: true });
  };

  // Show rejection screen — permanent until user clicks "Go to Auth Page"
  if (rejectedLocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">KhataFlow</CardTitle>
            <CardDescription className="mt-2">Registration Rejected</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
              <div className="space-y-2">
                <h3 className="font-semibold text-destructive">Access Denied</h3>
                <p className="text-sm text-muted-foreground">
                  {lockedReason || "Your registration request has been rejected by an administrator."}
                </p>
              </div>
            </div>

            <div className="text-center text-xs text-muted-foreground">
              If an administrator re-approves your account, you will be automatically redirected.
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Go to Auth Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
