import { describe, it, expect } from "vitest";

// Test the role hierarchy logic independently (extracted from hook)
type AppRole = "cipher" | "admin" | "moderator" | "user";

const roleHierarchy: Record<AppRole, number> = {
  cipher: 4,
  admin: 3,
  moderator: 2,
  user: 1,
};

function hasRoleLevel(role: AppRole | null, requiredRole: AppRole): boolean {
  if (role === null) return false;
  return roleHierarchy[role] >= roleHierarchy[requiredRole];
}

function canManageRole(role: AppRole | null, targetRole: AppRole): boolean {
  if (role === null) return false;
  if (role === "cipher") return true;
  if (role === "admin" && targetRole === "moderator") return true;
  return false;
}

describe("hasRoleLevel", () => {
  it("cipher has all role levels", () => {
    expect(hasRoleLevel("cipher", "cipher")).toBe(true);
    expect(hasRoleLevel("cipher", "admin")).toBe(true);
    expect(hasRoleLevel("cipher", "moderator")).toBe(true);
    expect(hasRoleLevel("cipher", "user")).toBe(true);
  });

  it("admin has admin and below", () => {
    expect(hasRoleLevel("admin", "cipher")).toBe(false);
    expect(hasRoleLevel("admin", "admin")).toBe(true);
    expect(hasRoleLevel("admin", "moderator")).toBe(true);
    expect(hasRoleLevel("admin", "user")).toBe(true);
  });

  it("moderator has moderator and below", () => {
    expect(hasRoleLevel("moderator", "cipher")).toBe(false);
    expect(hasRoleLevel("moderator", "admin")).toBe(false);
    expect(hasRoleLevel("moderator", "moderator")).toBe(true);
    expect(hasRoleLevel("moderator", "user")).toBe(true);
  });

  it("user has only user level", () => {
    expect(hasRoleLevel("user", "cipher")).toBe(false);
    expect(hasRoleLevel("user", "admin")).toBe(false);
    expect(hasRoleLevel("user", "moderator")).toBe(false);
    expect(hasRoleLevel("user", "user")).toBe(true);
  });

  it("null role has no access", () => {
    expect(hasRoleLevel(null, "user")).toBe(false);
    expect(hasRoleLevel(null, "cipher")).toBe(false);
  });
});

describe("canManageRole", () => {
  it("cipher can manage all roles", () => {
    expect(canManageRole("cipher", "admin")).toBe(true);
    expect(canManageRole("cipher", "moderator")).toBe(true);
    expect(canManageRole("cipher", "user")).toBe(true);
    expect(canManageRole("cipher", "cipher")).toBe(true);
  });

  it("admin can only manage moderators", () => {
    expect(canManageRole("admin", "moderator")).toBe(true);
    expect(canManageRole("admin", "admin")).toBe(false);
    expect(canManageRole("admin", "cipher")).toBe(false);
    expect(canManageRole("admin", "user")).toBe(false);
  });

  it("moderator cannot manage anyone", () => {
    expect(canManageRole("moderator", "user")).toBe(false);
    expect(canManageRole("moderator", "moderator")).toBe(false);
  });

  it("user cannot manage anyone", () => {
    expect(canManageRole("user", "user")).toBe(false);
  });

  it("null role cannot manage anyone", () => {
    expect(canManageRole(null, "user")).toBe(false);
  });
});
