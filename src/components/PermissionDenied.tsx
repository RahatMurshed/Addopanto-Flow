import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PermissionDeniedProps {
  title?: string;
  message?: string;
}

export function PermissionDenied({
  title = "Access Denied",
  message = "You don't have permission to view this page. Contact your company admin to request access.",
}: PermissionDeniedProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="rounded-full bg-destructive/10 p-4">
        <ShieldX className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="text-muted-foreground max-w-md">{message}</p>
      <Button variant="outline" onClick={() => navigate("/dashboard")}>
        Go to Dashboard
      </Button>
    </div>
  );
}
