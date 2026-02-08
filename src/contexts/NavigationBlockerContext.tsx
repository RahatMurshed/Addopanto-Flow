import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface NavigationBlockerContextType {
  isBlocking: boolean;
  setIsBlocking: (blocking: boolean) => void;
  pendingNavigation: string | null;
  setPendingNavigation: (path: string | null) => void;
  checkNavigation: (to: string) => boolean;
  proceed: () => void;
  reset: () => void;
}

const NavigationBlockerContext = createContext<NavigationBlockerContextType | null>(null);

export function NavigationBlockerProvider({ children }: { children: ReactNode }) {
  const [isBlocking, setIsBlocking] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const isDirtyRef = useRef(false);
  const location = useLocation();

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  const checkNavigation = useCallback((to: string): boolean => {
    if (isDirtyRef.current && to !== location.pathname) {
      setPendingNavigation(to);
      return true; // Block navigation
    }
    return false; // Allow navigation
  }, [location.pathname]);

  const proceed = useCallback(() => {
    setIsDirty(false);
    isDirtyRef.current = false;
    setPendingNavigation(null);
  }, []);

  const reset = useCallback(() => {
    setPendingNavigation(null);
  }, []);

  // Handle beforeunload
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

  return (
    <NavigationBlockerContext.Provider
      value={{
        isBlocking: isDirty,
        setIsBlocking: setIsDirty,
        pendingNavigation,
        setPendingNavigation,
        checkNavigation,
        proceed,
        reset,
      }}
    >
      {children}
    </NavigationBlockerContext.Provider>
  );
}

export function useNavigationBlocker() {
  const context = useContext(NavigationBlockerContext);
  if (!context) {
    throw new Error("useNavigationBlocker must be used within NavigationBlockerProvider");
  }
  return context;
}
