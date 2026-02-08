import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export interface BlockerState {
  isBlocked: boolean;
  pendingLocation: string | null;
  proceed: () => void;
  reset: () => void;
}

export function useUnsavedChanges(isDirty: boolean): BlockerState {
  const navigate = useNavigate();
  const location = useLocation();
  const [isBlocked, setIsBlocked] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<string | null>(null);
  const isDirtyRef = useRef(isDirty);

  // Keep ref in sync
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Handle browser back/forward buttons
  useEffect(() => {
    if (!isDirty) return;

    const handlePopState = (e: PopStateEvent) => {
      if (isDirtyRef.current) {
        // Push the current state back to prevent navigation
        window.history.pushState(null, "", location.pathname + location.search);
        setIsBlocked(true);
        setPendingLocation("back");
      }
    };

    // Push initial state so we can intercept back button
    window.history.pushState(null, "", location.pathname + location.search);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDirty, location.pathname, location.search]);

  // Handle browser refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const proceed = useCallback(() => {
    setIsBlocked(false);
    if (pendingLocation === "back") {
      // Go back in history
      window.history.go(-1);
    } else if (pendingLocation) {
      navigate(pendingLocation);
    }
    setPendingLocation(null);
  }, [pendingLocation, navigate]);

  const reset = useCallback(() => {
    setIsBlocked(false);
    setPendingLocation(null);
  }, []);

  // Expose a method to block navigation programmatically
  const blockNavigation = useCallback((to: string) => {
    if (isDirtyRef.current) {
      setIsBlocked(true);
      setPendingLocation(to);
      return true;
    }
    return false;
  }, []);

  return {
    isBlocked,
    pendingLocation,
    proceed,
    reset,
  };
}
