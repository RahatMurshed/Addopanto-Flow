import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { BlockerState } from "@/hooks/useUnsavedChanges";

interface UnsavedChangesDialogProps {
  blocker: BlockerState;
}

export function UnsavedChangesDialog({ blocker }: UnsavedChangesDialogProps) {
  const navigate = useNavigate();

  const handleProceed = () => {
    const pendingPath = blocker.pendingLocation;
    blocker.proceed();
    if (pendingPath) {
      navigate(pendingPath);
    }
  };

  if (!blocker.isBlocked) {
    return null;
  }

  return (
    <AlertDialog open={true}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={blocker.reset}>
            Stay on Page
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleProceed}>
            Leave Page
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
