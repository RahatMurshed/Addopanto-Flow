import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProfileAccessGateProps {
  onBack: () => void;
}

export function ProfileAccessDenied({ onBack }: ProfileAccessGateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 rounded-full bg-secondary/10 p-5">
        <Lock className="h-10 w-10 text-secondary" />
      </div>
      <h2 className="text-xl font-bold text-secondary mb-2">Access Restricted</h2>
      <p className="text-muted-foreground max-w-md mb-6">
        You don't have permission to view this student's profile.
      </p>
      <Button variant="outline" onClick={onBack}>
        Back to Students
      </Button>
    </div>
  );
}

export function ProfileNotFound({ onBack }: ProfileAccessGateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-muted-foreground mb-4">Student not found</p>
      <Button variant="link" onClick={onBack}>
        Back to Students
      </Button>
    </div>
  );
}
