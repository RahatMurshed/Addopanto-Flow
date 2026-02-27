import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileBreadcrumbProps {
  studentName?: string;
  isLoading: boolean;
  onBack: () => void;
}

export function ProfileBreadcrumb({ studentName, isLoading, onBack }: ProfileBreadcrumbProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground gap-1 px-2"
        onClick={onBack}
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Button>
      <span className="text-muted-foreground">/</span>
      <Link to="/students" className="text-muted-foreground hover:text-foreground transition-colors">
        Students
      </Link>
      <span className="text-muted-foreground">/</span>
      {isLoading ? (
        <Skeleton className="w-48 h-4 rounded" />
      ) : (
        <span className="font-medium text-foreground">{studentName}</span>
      )}
    </div>
  );
}
