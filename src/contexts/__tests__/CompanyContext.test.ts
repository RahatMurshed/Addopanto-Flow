import { describe, it, expect } from "vitest";

/**
 * Pure-logic tests for the isModerator / isCompanyAdmin derivation
 * used in CompanyContext. We extract the logic into testable expressions
 * so we can verify all role combinations without rendering providers.
 */

type CompanyRole = "admin" | "moderator";

interface GuardInputs {
  membershipRole: CompanyRole | null; // null = no membership row
  isCipher: boolean;
}

function deriveGuards(input: GuardInputs) {
  const isCompanyAdmin = input.membershipRole === "admin" || input.isCipher;
  const isModerator = input.membershipRole === "moderator" && !isCompanyAdmin;
  return { isCompanyAdmin, isModerator };
}

describe("CompanyContext role guards", () => {
  describe("isCompanyAdmin", () => {
    it("is true when membership role is admin", () => {
      const { isCompanyAdmin } = deriveGuards({ membershipRole: "admin", isCipher: false });
      expect(isCompanyAdmin).toBe(true);
    });

    it("is true when user is cipher, regardless of membership role", () => {
      expect(deriveGuards({ membershipRole: "moderator", isCipher: true }).isCompanyAdmin).toBe(true);
      expect(deriveGuards({ membershipRole: "admin", isCipher: true }).isCompanyAdmin).toBe(true);
      expect(deriveGuards({ membershipRole: null, isCipher: true }).isCompanyAdmin).toBe(true);
    });

    it("is false for moderator membership without cipher", () => {
      const { isCompanyAdmin } = deriveGuards({ membershipRole: "moderator", isCipher: false });
      expect(isCompanyAdmin).toBe(false);
    });

    it("is false when no membership and not cipher", () => {
      const { isCompanyAdmin } = deriveGuards({ membershipRole: null, isCipher: false });
      expect(isCompanyAdmin).toBe(false);
    });
  });

  describe("isModerator", () => {
    it("is true only for moderator membership without admin/cipher status", () => {
      const { isModerator } = deriveGuards({ membershipRole: "moderator", isCipher: false });
      expect(isModerator).toBe(true);
    });

    it("is false for cipher user with moderator membership (regression guard)", () => {
      const { isModerator } = deriveGuards({ membershipRole: "moderator", isCipher: true });
      expect(isModerator).toBe(false);
    });

    it("is false for admin membership", () => {
      const { isModerator } = deriveGuards({ membershipRole: "admin", isCipher: false });
      expect(isModerator).toBe(false);
    });

    it("is false when no membership exists", () => {
      const { isModerator } = deriveGuards({ membershipRole: null, isCipher: false });
      expect(isModerator).toBe(false);
    });
  });

  describe("combined scenarios", () => {
    it("cipher with admin membership: admin=true, moderator=false", () => {
      const guards = deriveGuards({ membershipRole: "admin", isCipher: true });
      expect(guards.isCompanyAdmin).toBe(true);
      expect(guards.isModerator).toBe(false);
    });

    it("cipher with no membership: admin=true, moderator=false", () => {
      const guards = deriveGuards({ membershipRole: null, isCipher: true });
      expect(guards.isCompanyAdmin).toBe(true);
      expect(guards.isModerator).toBe(false);
    });

    it("regular user with no membership: admin=false, moderator=false", () => {
      const guards = deriveGuards({ membershipRole: null, isCipher: false });
      expect(guards.isCompanyAdmin).toBe(false);
      expect(guards.isModerator).toBe(false);
    });
  });
});
