import { describe, it, expect } from "vitest";
import { validateBackupData, getBackupPreview, type BackupData } from "../dataBackupUtils";

const validBackup: BackupData = {
  version: "1.0",
  exportedAt: "2025-01-01T00:00:00.000Z",
  userEmail: "test@example.com",
  data: {
    expense_accounts: [{ id: "1", name: "Rent" }],
    revenue_sources: [{ id: "2", name: "Fees" }],
    revenues: [],
    allocations: [],
    expenses: [{ id: "3", amount: 100 }],
    khata_transfers: [],
  },
};

describe("validateBackupData", () => {
  it("accepts valid backup", () => {
    expect(validateBackupData(validBackup)).toEqual({ valid: true });
  });

  it("rejects null", () => {
    const result = validateBackupData(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid backup format");
  });

  it("rejects non-object", () => {
    expect(validateBackupData("string").valid).toBe(false);
    expect(validateBackupData(123).valid).toBe(false);
  });

  it("rejects wrong version", () => {
    const result = validateBackupData({ ...validBackup, version: "2.0" });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Unsupported backup version");
  });

  it("rejects missing version", () => {
    const { version, ...noVersion } = validBackup;
    expect(validateBackupData(noVersion).valid).toBe(false);
  });

  it("rejects missing exportedAt", () => {
    const result = validateBackupData({ ...validBackup, exportedAt: "" });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Missing backup metadata");
  });

  it("rejects missing userEmail", () => {
    const result = validateBackupData({ ...validBackup, userEmail: "" });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Missing backup metadata");
  });

  it("rejects missing data section", () => {
    const result = validateBackupData({ ...validBackup, data: null });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Missing data section");
  });

  it("rejects missing required table", () => {
    const badData = {
      ...validBackup,
      data: { ...validBackup.data, expenses: "not-an-array" },
    };
    const result = validateBackupData(badData);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("expenses");
  });

  it("rejects when a required table is undefined", () => {
    const { expenses, ...rest } = validBackup.data;
    const result = validateBackupData({ ...validBackup, data: rest });
    expect(result.valid).toBe(false);
  });
});

describe("getBackupPreview", () => {
  it("returns correct counts", () => {
    const preview = getBackupPreview(validBackup);
    expect(preview.expenseAccountsCount).toBe(1);
    expect(preview.revenueSourcesCount).toBe(1);
    expect(preview.revenuesCount).toBe(0);
    expect(preview.allocationsCount).toBe(0);
    expect(preview.expensesCount).toBe(1);
    expect(preview.khataTransfersCount).toBe(0);
  });

  it("returns metadata", () => {
    const preview = getBackupPreview(validBackup);
    expect(preview.exportedAt).toBe("2025-01-01T00:00:00.000Z");
    expect(preview.userEmail).toBe("test@example.com");
  });

  it("handles empty backup", () => {
    const emptyBackup: BackupData = {
      ...validBackup,
      data: {
        expense_accounts: [],
        revenue_sources: [],
        revenues: [],
        allocations: [],
        expenses: [],
        khata_transfers: [],
      },
    };
    const preview = getBackupPreview(emptyBackup);
    expect(preview.expenseAccountsCount).toBe(0);
    expect(preview.revenueSourcesCount).toBe(0);
  });
});
