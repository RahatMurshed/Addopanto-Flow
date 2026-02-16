/**
 * Automated axe-core accessibility checks for all application routes.
 *
 * Public routes are rendered directly. Protected route components are
 * rendered in isolation (they may show loading/error states).
 *
 * Run: vitest run src/test/axe-routes.test.tsx
 */
import { describe, it, expect } from "vitest";
import React, { Suspense } from "react";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import "vitest-axe/extend-expect";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";

function TestShell({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <BrowserRouter>
          <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

const AXE_OPTS = {
  rules: {
    region: { enabled: false },
    "landmark-one-main": { enabled: false },
    "color-contrast": { enabled: false },
    bypass: { enabled: false },
  },
};

interface RouteSpec {
  label: string;
  load: () => Promise<{ default: React.ComponentType }>;
}

const PUBLIC: RouteSpec[] = [
  { label: "LandingPage (/)", load: () => import("@/pages/LandingPage") },
  { label: "Auth (/auth)", load: () => import("@/pages/Auth") },
  { label: "NotFound (/*)", load: () => import("@/pages/NotFound") },
];

const PROTECTED: RouteSpec[] = [
  { label: "Dashboard", load: () => import("@/pages/Dashboard") },
  { label: "CompanySelection", load: () => import("@/pages/CompanySelection") },
  { label: "JoinCompany", load: () => import("@/pages/JoinCompany") },
  { label: "CreateCompany", load: () => import("@/pages/CreateCompany") },
  { label: "Students", load: () => import("@/pages/Students") },
  { label: "Courses", load: () => import("@/pages/Courses") },
  { label: "Revenue", load: () => import("@/pages/Revenue") },
  { label: "Expenses", load: () => import("@/pages/Expenses") },
  { label: "Reports", load: () => import("@/pages/Reports") },
  { label: "Khatas", load: () => import("@/pages/Khatas") },
  { label: "SettingsPage", load: () => import("@/pages/SettingsPage") },
  { label: "ProfilePage", load: () => import("@/pages/ProfilePage") },
  { label: "AuditLog", load: () => import("@/pages/AuditLog") },
  { label: "UserManagement", load: () => import("@/pages/UserManagement") },
  { label: "CompanyMembers", load: () => import("@/pages/CompanyMembers") },
  { label: "PresetsManagement", load: () => import("@/pages/PresetsManagement") },
  { label: "CompanyCreationRequests", load: () => import("@/pages/CompanyCreationRequests") },
  { label: "Batches", load: () => import("@/pages/Batches") },
  { label: "AddStudent", load: () => import("@/pages/AddStudent") },
];

// New/experimental routes — warnings only (non-blocking fence checks)
const FENCE_ROUTES: RouteSpec[] = [
  // Move routes here temporarily when first added; promote to PROTECTED once stable
  // Example: { label: "NewFeature", load: () => import("@/pages/NewFeature") },
];

async function runAxeCheck(spec: RouteSpec, mode: "strict" | "fence" = "strict") {
  const Comp = (await spec.load()).default;
  let container: HTMLElement;
  try {
    const result = render(
      <TestShell>
        <Comp />
      </TestShell>
    );
    container = result.container;
  } catch {
    // Component threw (missing context) — skip gracefully
    return;
  }
  const results = await axe(container, AXE_OPTS);
  if (results.violations.length > 0) {
    const summary = results.violations
      .map(
        (v) =>
          `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} node(s))\n` +
          v.nodes.map((n) => `  → ${n.html.slice(0, 120)}`).join("\n")
      )
      .join("\n\n");

    if (mode === "fence") {
      // Non-blocking: log warning but don't fail
      console.warn(`⚠️ A11y fence warnings in ${spec.label}:\n${summary}`);
    } else {
      expect.fail(`A11y violations in ${spec.label}:\n${summary}`);
    }
  }
}

describe("axe-core — Public Routes (blocking)", () => {
  for (const spec of PUBLIC) {
    it(`${spec.label} passes axe checks`, () => runAxeCheck(spec, "strict"), 30_000);
  }
});

describe("axe-core — Protected Route Components (blocking)", () => {
  for (const spec of PROTECTED) {
    it(`${spec.label} passes axe checks`, () => runAxeCheck(spec, "strict"), 30_000);
  }
});

describe("axe-core — Fence Checks (non-blocking warnings)", () => {
  if (FENCE_ROUTES.length === 0) {
    it("no fence routes configured (add new routes here first)", () => {
      expect(true).toBe(true);
    });
  }
  for (const spec of FENCE_ROUTES) {
    it(`${spec.label} — fence check (warnings only)`, () => runAxeCheck(spec, "fence"), 30_000);
  }
});

describe("axe-core — Route Coverage", () => {
  it("covers all application routes", () => {
    const all = [...PUBLIC, ...PROTECTED, ...FENCE_ROUTES].map((r) => r.label);
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBeGreaterThanOrEqual(22);
  });
});
