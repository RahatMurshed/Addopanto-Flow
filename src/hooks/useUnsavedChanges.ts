import { useEffect } from "react";
import { useNavigationBlocker } from "@/contexts/NavigationBlockerContext";

export interface BlockerState {
  isBlocked: boolean;
  pendingLocation: string | null;
  proceed: () => void;
  reset: () => void;
}

export function useUnsavedChanges(isDirty: boolean): BlockerState {
  const { setIsBlocking, pendingNavigation, proceed, reset } = useNavigationBlocker();

  // Sync dirty state with context
  useEffect(() => {
    setIsBlocking(isDirty);
  }, [isDirty, setIsBlocking]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      setIsBlocking(false);
    };
  }, [setIsBlocking]);

  return {
    isBlocked: pendingNavigation !== null,
    pendingLocation: pendingNavigation,
    proceed,
    reset,
  };
}
