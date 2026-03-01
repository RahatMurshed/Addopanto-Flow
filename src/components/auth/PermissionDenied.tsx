import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useCompany } from "@/contexts/CompanyContext";

interface PermissionDeniedProps {
  title?: string;
  message?: string;
  /** If set, auto-redirects after this many seconds */
  autoRedirectSeconds?: number;
}

export function PermissionDenied({
  title = "Access Denied",
  message = "You don't have permission to view this page. Contact your company admin to request access.",
  autoRedirectSeconds,
}: PermissionDeniedProps) {
  const navigate = useNavigate();
  const { isModerator } = useCompany();
  const [countdown, setCountdown] = useState(autoRedirectSeconds ?? 0);

  // Moderators can't access dashboard, so redirect to students instead
  const fallbackRoute = isModerator ? "/students" : "/dashboard";
  const fallbackLabel = isModerator ? "Go Back" : "Go to Dashboard";

  useEffect(() => {
    if (!autoRedirectSeconds) return;
    if (countdown <= 0) {
      navigate(fallbackRoute, { replace: true });
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, autoRedirectSeconds, navigate, fallbackRoute]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="rounded-full bg-destructive/10 p-4">
        <ShieldX className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="text-muted-foreground max-w-md">{message}</p>
      {autoRedirectSeconds ? (
        <p className="text-sm text-muted-foreground">
          Redirecting in {countdown}s…
        </p>
      ) : null}
      <Button variant="outline" onClick={() => navigate(fallbackRoute)}>
        {fallbackLabel}
      </Button>
    </div>
  );
}
