import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SEMANTIC_PAIRS, validateAndFixContrast } from "@/utils/contrastValidator";

/** Remove any inline overrides set by the contrast validator before re-validating */
function clearContrastOverrides() {
  for (const pair of SEMANTIC_PAIRS) {
    document.documentElement.style.removeProperty(pair.fg);
  }
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    // Read synchronously so initial render matches
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
    clearContrastOverrides();
    requestAnimationFrame(() => validateAndFixContrast());
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle("dark", newDark);
    localStorage.setItem("theme", newDark ? "dark" : "light");
    // Clear stale inline overrides from previous theme, then re-validate
    clearContrastOverrides();
    requestAnimationFrame(() => validateAndFixContrast());
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
