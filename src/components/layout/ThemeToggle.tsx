import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SEMANTIC_PAIRS, validateAndFixContrast } from "@/utils/contrastValidator";

/** Remove ALL inline style overrides set by the contrast validator */
function clearAllContrastOverrides() {
  for (const pair of SEMANTIC_PAIRS) {
    document.documentElement.style.removeProperty(pair.fg);
    document.documentElement.style.removeProperty(pair.bg);
  }
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored === "dark" || (!stored && prefersDark);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
    clearAllContrastOverrides();
    // Double rAF ensures browser has recomputed styles from CSS after clearing inline overrides
    requestAnimationFrame(() => {
      requestAnimationFrame(() => validateAndFixContrast());
    });
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle("dark", newDark);
    localStorage.setItem("theme", newDark ? "dark" : "light");
    // Clear stale inline overrides, wait for CSS recompute, then re-validate
    clearAllContrastOverrides();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => validateAndFixContrast());
    });
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
