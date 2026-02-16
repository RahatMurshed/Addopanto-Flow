import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Moon, Sun, CheckCircle2, AlertTriangle, XCircle, RotateCcw, Palette } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  parseHSL,
  hslToString,
  contrastRatio,
  adjustForContrast,
  SEMANTIC_PAIRS,
  type TokenPair,
} from "@/utils/contrastValidator";

// ── Types ───────────────────────────────────────────────────────

interface TokenSet {
  [key: string]: string; // e.g. "--primary": "30 100% 35%"
}

interface PairResult {
  pair: TokenPair;
  ratio: number;
  grade: "AAA" | "AA" | "AA-large" | "fail";
  passes: boolean;
  canAutoFix: boolean;
}

// ── Default token sets (from index.css) ─────────────────────────

const DEFAULT_LIGHT: TokenSet = {
  "--background": "210 20% 98%",
  "--foreground": "220 20% 10%",
  "--card": "0 0% 100%",
  "--card-foreground": "220 20% 10%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "220 20% 10%",
  "--primary": "30 100% 35%",
  "--primary-foreground": "0 0% 100%",
  "--secondary": "217 70% 25%",
  "--secondary-foreground": "0 0% 100%",
  "--muted": "210 40% 96%",
  "--muted-foreground": "215 20% 42%",
  "--accent": "210 40% 96%",
  "--accent-foreground": "220 20% 10%",
  "--destructive": "0 84% 45%",
  "--destructive-foreground": "0 0% 100%",
  "--success": "142 76% 30%",
  "--success-foreground": "0 0% 100%",
  "--warning": "38 92% 32%",
  "--warning-foreground": "0 0% 100%",
  "--sidebar-background": "217 70% 18%",
  "--sidebar-foreground": "210 40% 98%",
  "--sidebar-primary": "30 100% 35%",
  "--sidebar-primary-foreground": "0 0% 100%",
  "--sidebar-accent": "217 50% 25%",
  "--sidebar-accent-foreground": "210 40% 98%",
};

const DEFAULT_DARK: TokenSet = {
  "--background": "222 47% 6%",
  "--foreground": "210 40% 98%",
  "--card": "222 47% 8%",
  "--card-foreground": "210 40% 98%",
  "--popover": "222 47% 8%",
  "--popover-foreground": "210 40% 98%",
  "--primary": "30 100% 55%",
  "--primary-foreground": "220 20% 8%",
  "--secondary": "217 50% 22%",
  "--secondary-foreground": "210 40% 98%",
  "--muted": "217 33% 17%",
  "--muted-foreground": "215 20% 68%",
  "--accent": "217 33% 17%",
  "--accent-foreground": "210 40% 98%",
  "--destructive": "0 72% 45%",
  "--destructive-foreground": "0 0% 100%",
  "--success": "142 76% 42%",
  "--success-foreground": "220 20% 8%",
  "--warning": "38 92% 55%",
  "--warning-foreground": "220 20% 8%",
  "--sidebar-background": "217 60% 12%",
  "--sidebar-foreground": "210 40% 98%",
  "--sidebar-primary": "30 100% 55%",
  "--sidebar-primary-foreground": "220 20% 8%",
  "--sidebar-accent": "217 40% 20%",
  "--sidebar-accent-foreground": "210 40% 98%",
};

// ── Helpers ─────────────────────────────────────────────────────

function auditTokens(tokens: TokenSet): PairResult[] {
  return SEMANTIC_PAIRS.map((pair) => {
    const fgRaw = tokens[pair.fg];
    const bgRaw = tokens[pair.bg];
    if (!fgRaw || !bgRaw) return { pair, ratio: 0, grade: "fail" as const, passes: false, canAutoFix: false };

    const fg = parseHSL(fgRaw);
    const bg = parseHSL(bgRaw);
    if (!fg || !bg) return { pair, ratio: 0, grade: "fail" as const, passes: false, canAutoFix: false };

    const ratio = Math.round(contrastRatio(fg, bg) * 100) / 100;
    const required = pair.minRatio ?? 4.5;
    const grade = ratio >= 7 ? "AAA" as const : ratio >= 4.5 ? "AA" as const : ratio >= 3 ? "AA-large" as const : "fail" as const;
    const passes = ratio >= required;
    const canAutoFix = !passes && !!adjustForContrast(fg, bg, required);

    return { pair, ratio, grade, passes, canAutoFix };
  });
}

function hslToCssColor(raw: string): string {
  return `hsl(${raw.replace(/%/g, "%")})`;
}

function friendlyName(token: string): string {
  return token
    .replace(/^--/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const GRADE_CONFIG = {
  AAA: { icon: CheckCircle2, color: "text-success", label: "AAA" },
  AA: { icon: CheckCircle2, color: "text-success", label: "AA" },
  "AA-large": { icon: AlertTriangle, color: "text-warning", label: "AA Large" },
  fail: { icon: XCircle, color: "text-destructive", label: "Fail" },
} as const;

// ── Component ───────────────────────────────────────────────────

export function DesignTokenEditor() {
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");
  const [lightTokens, setLightTokens] = useState<TokenSet>({ ...DEFAULT_LIGHT });
  const [darkTokens, setDarkTokens] = useState<TokenSet>({ ...DEFAULT_DARK });
  const [editingToken, setEditingToken] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const tokens = previewMode === "light" ? lightTokens : darkTokens;
  const setTokens = previewMode === "light" ? setLightTokens : setDarkTokens;

  const results = useMemo(() => auditTokens(tokens), [tokens]);
  const passCount = results.filter((r) => r.passes).length;
  const failCount = results.filter((r) => !r.passes).length;

  useEffect(() => {
    if (editingToken && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingToken]);

  const handleTokenEdit = useCallback((tokenName: string) => {
    setEditingToken(tokenName);
    setEditValue(tokens[tokenName] ?? "");
  }, [tokens]);

  const handleTokenSave = useCallback(() => {
    if (!editingToken) return;
    const parsed = parseHSL(editValue);
    if (parsed) {
      setTokens((prev) => ({ ...prev, [editingToken]: hslToString(parsed) }));
    }
    setEditingToken(null);
    setEditValue("");
  }, [editingToken, editValue, setTokens]);

  const handleAutoFix = useCallback((pair: TokenPair) => {
    const fgRaw = tokens[pair.fg];
    const bgRaw = tokens[pair.bg];
    if (!fgRaw || !bgRaw) return;
    const fg = parseHSL(fgRaw);
    const bg = parseHSL(bgRaw);
    if (!fg || !bg) return;
    const required = pair.minRatio ?? 4.5;
    const fixed = adjustForContrast(fg, bg, required);
    if (fixed) {
      setTokens((prev) => ({ ...prev, [pair.fg]: hslToString(fixed) }));
    }
  }, [tokens, setTokens]);

  const handleAutoFixAll = useCallback(() => {
    const failing = results.filter((r) => !r.passes && r.canAutoFix);
    if (failing.length === 0) return;
    setTokens((prev) => {
      const next = { ...prev };
      for (const r of failing) {
        const fg = parseHSL(next[r.pair.fg] ?? "");
        const bg = parseHSL(next[r.pair.bg] ?? "");
        if (!fg || !bg) continue;
        const fixed = adjustForContrast(fg, bg, r.pair.minRatio ?? 4.5);
        if (fixed) next[r.pair.fg] = hslToString(fixed);
      }
      return next;
    });
  }, [results, setTokens]);

  const handleReset = useCallback(() => {
    if (previewMode === "light") setLightTokens({ ...DEFAULT_LIGHT });
    else setDarkTokens({ ...DEFAULT_DARK });
  }, [previewMode]);

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Design Token Editor</CardTitle>
                <CardDescription>Edit color tokens with live WCAG AA contrast validation</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Theme preview toggle */}
              <div className="flex items-center rounded-lg border bg-muted p-0.5">
                <button
                  onClick={() => setPreviewMode("light")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                    previewMode === "light"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  Light
                </button>
                <button
                  onClick={() => setPreviewMode("dark")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                    previewMode === "dark"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" />
                  Dark
                </button>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleReset}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset to defaults</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Summary badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-success" />
              {passCount} passing
            </Badge>
            {failCount > 0 && (
              <>
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  {failCount} failing
                </Badge>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleAutoFixAll}>
                  Auto-fix all ({results.filter((r) => r.canAutoFix).length})
                </Button>
              </>
            )}
            {failCount === 0 && (
              <Badge className="gap-1 bg-success text-success-foreground">
                All pairs WCAG AA compliant
              </Badge>
            )}
          </div>

          {/* Live preview strip */}
          <div
            className="rounded-lg border overflow-hidden"
            style={{ backgroundColor: hslToCssColor(tokens["--background"] ?? "0 0% 100%") }}
          >
            <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
              <span
                className="text-sm font-medium"
                style={{ color: hslToCssColor(tokens["--foreground"] ?? "0 0% 0%") }}
              >
                Preview Text
              </span>
              <span
                className="rounded-md px-2 py-0.5 text-xs font-semibold"
                style={{
                  backgroundColor: hslToCssColor(tokens["--primary"] ?? "30 100% 35%"),
                  color: hslToCssColor(tokens["--primary-foreground"] ?? "0 0% 100%"),
                }}
              >
                Primary
              </span>
              <span
                className="rounded-md px-2 py-0.5 text-xs font-semibold"
                style={{
                  backgroundColor: hslToCssColor(tokens["--secondary"] ?? "217 70% 25%"),
                  color: hslToCssColor(tokens["--secondary-foreground"] ?? "0 0% 100%"),
                }}
              >
                Secondary
              </span>
              <span
                className="rounded-md px-2 py-0.5 text-xs font-semibold"
                style={{
                  backgroundColor: hslToCssColor(tokens["--destructive"] ?? "0 84% 45%"),
                  color: hslToCssColor(tokens["--destructive-foreground"] ?? "0 0% 100%"),
                }}
              >
                Destructive
              </span>
              <span
                className="rounded-md px-2 py-0.5 text-xs font-semibold"
                style={{
                  backgroundColor: hslToCssColor(tokens["--success"] ?? "142 76% 30%"),
                  color: hslToCssColor(tokens["--success-foreground"] ?? "0 0% 100%"),
                }}
              >
                Success
              </span>
              <span
                className="rounded-md px-2 py-0.5 text-xs font-semibold"
                style={{
                  backgroundColor: hslToCssColor(tokens["--warning"] ?? "38 92% 32%"),
                  color: hslToCssColor(tokens["--warning-foreground"] ?? "0 0% 100%"),
                }}
              >
                Warning
              </span>
              <span
                className="text-xs"
                style={{ color: hslToCssColor(tokens["--muted-foreground"] ?? "215 20% 42%") }}
              >
                Muted text
              </span>
            </div>
            {/* Card preview inside */}
            <div className="px-4 pb-3">
              <div
                className="rounded-md border p-3"
                style={{
                  backgroundColor: hslToCssColor(tokens["--card"] ?? "0 0% 100%"),
                  borderColor: hslToCssColor(tokens["--border"] ?? tokens["--input"] ?? "214 32% 82%"),
                }}
              >
                <span
                  className="text-sm"
                  style={{ color: hslToCssColor(tokens["--card-foreground"] ?? "0 0% 0%") }}
                >
                  Card content with foreground text
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contrast pair table */}
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-foreground">Contrast Pairs</h3>
            <div className="rounded-md border overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>Token Pair</span>
                <span className="text-center w-14">Ratio</span>
                <span className="text-center w-16">Grade</span>
                <span className="text-center w-16">Action</span>
              </div>
              {results.map((r, i) => {
                const GradeIcon = GRADE_CONFIG[r.grade].icon;
                return (
                  <div
                    key={i}
                    className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-3 py-2 text-sm border-t ${
                      !r.passes ? "bg-destructive/5" : ""
                    }`}
                  >
                    {/* Token pair with inline swatches */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center gap-1 shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="h-5 w-5 rounded border cursor-pointer hover:ring-2 hover:ring-ring"
                              style={{ backgroundColor: hslToCssColor(tokens[r.pair.fg] ?? "0 0% 50%") }}
                              onClick={() => handleTokenEdit(r.pair.fg)}
                              aria-label={`Edit ${r.pair.fg}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            {friendlyName(r.pair.fg)}: {tokens[r.pair.fg]}
                          </TooltipContent>
                        </Tooltip>
                        <span className="text-muted-foreground text-xs">on</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="h-5 w-5 rounded border cursor-pointer hover:ring-2 hover:ring-ring"
                              style={{ backgroundColor: hslToCssColor(tokens[r.pair.bg] ?? "0 0% 50%") }}
                              onClick={() => handleTokenEdit(r.pair.bg)}
                              aria-label={`Edit ${r.pair.bg}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            {friendlyName(r.pair.bg)}: {tokens[r.pair.bg]}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="truncate text-xs text-muted-foreground">
                        {friendlyName(r.pair.fg)} / {friendlyName(r.pair.bg)}
                      </span>
                    </div>

                    {/* Ratio */}
                    <span className={`text-center w-14 font-mono text-xs ${r.passes ? "text-foreground" : "text-destructive font-semibold"}`}>
                      {r.ratio.toFixed(1)}:1
                    </span>

                    {/* Grade badge */}
                    <div className="flex justify-center w-16">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${GRADE_CONFIG[r.grade].color}`}>
                        <GradeIcon className="h-3.5 w-3.5" />
                        {GRADE_CONFIG[r.grade].label}
                      </span>
                    </div>

                    {/* Auto-fix button */}
                    <div className="flex justify-center w-16">
                      {!r.passes && r.canAutoFix ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleAutoFix(r.pair)}
                        >
                          Fix
                        </Button>
                      ) : r.passes ? (
                        <span className="text-success text-xs">✓</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inline token editor */}
          {editingToken && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{friendlyName(editingToken)}</span>
                <div
                  className="h-6 w-6 rounded border"
                  style={{ backgroundColor: hslToCssColor(editValue || tokens[editingToken] || "0 0% 50%") }}
                />
              </div>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTokenSave();
                    if (e.key === "Escape") { setEditingToken(null); setEditValue(""); }
                  }}
                  placeholder="e.g. 30 100% 35%"
                  className="flex-1 rounded-md border bg-background px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button size="sm" className="h-8" onClick={handleTokenSave}>
                  Apply
                </Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => { setEditingToken(null); setEditValue(""); }}>
                  Cancel
                </Button>
              </div>
              {editValue && !parseHSL(editValue) && (
                <p className="text-xs text-destructive">Invalid HSL format. Use: H S% L% (e.g. 30 100% 35%)</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
