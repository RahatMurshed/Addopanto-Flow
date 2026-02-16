import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

interface PermissionDeniedProps {
  title?: string;
  message?: string;
  /** If set, auto-redirects to /dashboard after this many seconds */
  autoRedirectSeconds?: number;
}

export function PermissionDenied({
  title = "Access Denied",
  message = "You don't have permission to view this page. Contact your company admin to request access.",
  autoRedirectSeconds,
}: PermissionDeniedProps) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(autoRedirectSeconds ?? 0);

  useEffect(() => {
    if (!autoRedirectSeconds) return;
    if (countdown <= 0) {
      navigate("/dashboard", { replace: true });
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, autoRedirectSeconds, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="rounded-full bg-destructive/10 p-4">
        <ShieldX className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="text-muted-foreground max-w-md">{message}</p>
      {autoRedirectSeconds ? (
        <p className="text-sm text-muted-foreground">
          Redirecting to dashboard in {countdown}s…
        </p>
      ) : null}
      <Button variant="outline" onClick={() => navigate("/dashboard")}>
        Go to Dashboard
      </Button>
    </div>
  );
}
