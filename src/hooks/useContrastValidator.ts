import { useEffect, useRef, useState } from "react";
import { auditContrast, validateAndFixContrast, type ContrastIssue } from "@/utils/contrastValidator";

/**
 * React hook that validates contrast on mount and on theme changes.
 * Optionally auto-fixes issues if `autoFix` is true (default).
 *
 * @returns The latest contrast audit results for inspection.
 */
export function useContrastValidator(autoFix = true) {
  const [issues, setIssues] = useState<ContrastIssue[]>([]);
  const observer = useRef<MutationObserver | null>(null);

  useEffect(() => {
    const run = () => {
      if (autoFix) {
        const fixed = validateAndFixContrast();
        setIssues(fixed);
      } else {
        const audit = auditContrast();
        setIssues(
          audit
            .filter((a) => !a.passes)
            .map((a) => ({
              pair: a.pair,
              ratio: a.ratio,
              required: a.pair.minRatio ?? 4.5,
              adjusted: false,
            }))
        );
      }
    };

    // Run once on mount (after paint — double rAF to ensure CSS recompute)
    requestAnimationFrame(() => requestAnimationFrame(run));

    // Watch for class changes on <html> (theme toggle adds/removes "dark")
    observer.current = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === "class") {
          requestAnimationFrame(() => requestAnimationFrame(run));
          break;
        }
      }
    });

    observer.current.observe(document.documentElement, { attributes: true });

    return () => observer.current?.disconnect();
  }, [autoFix]);

  return issues;
}
