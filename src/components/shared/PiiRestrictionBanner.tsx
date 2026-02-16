import { ShieldAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PiiRestrictionBanner() {
  return (
    <Alert variant="default" className="border-amber-500/30 bg-amber-500/5">
      <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
        Some student details (contact info, addresses, family, and medical data) are restricted to administrators.
      </AlertDescription>
    </Alert>
  );
}
