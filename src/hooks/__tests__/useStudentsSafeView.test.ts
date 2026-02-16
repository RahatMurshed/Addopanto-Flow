import { describe, it, expect, vi, beforeEach } from "vitest";

// Track calls to supabase.from()
const fromCalls: string[] = [];

const chainMock: any = new Proxy({}, {
  get: () => (...args: any[]) => {
    // For terminal methods, return a resolved promise
    if (typeof args[0] === 'undefined' || typeof args[0] === 'string' || typeof args[0] === 'number' || typeof args[0] === 'boolean') {
      return chainMock;
    }
    return chainMock;
  },
});

// Build a deeply chainable mock that resolves at async boundaries
function createChainMock(): any {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === 'then') return undefined; // not thenable by default
      return (...args: any[]) => {
        // Terminal async calls
        if (prop === 'single' || prop === 'maybeSingle') {
          return Promise.resolve({ data: null, error: null });
        }
        if (prop === 'range') {
          return Promise.resolve({ data: [], error: null, count: 0 });
        }
        return createChainMock();
      };
    },
  };
  return new Proxy({}, handler);
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      fromCalls.push(table);
      return createChainMock();
    },
  },
}));

let mockCanViewStudentPII = true;

vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: () => ({
    activeCompanyId: "company-1",
    canViewStudentPII: mockCanViewStudentPII,
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@test.com" },
  }),
}));

// Capture queryKey and queryFn from useQuery calls
let capturedOptions: any = null;
vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn((opts: any) => {
    capturedOptions = opts;
    return { data: undefined, isLoading: true, error: null };
  }),
  useMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

describe("Safe view table selection", () => {
  beforeEach(() => {
    fromCalls.length = 0;
    capturedOptions = null;
  });

  describe("useStudents", () => {
    it("includes 'students' in queryKey when canViewStudentPII is true", async () => {
      mockCanViewStudentPII = true;
      const { useStudents } = await import("../useStudents");
      useStudents();
      const keyObj = capturedOptions.queryKey.find((k: any) => typeof k === "object" && k !== null && "table" in k);
      expect(keyObj.table).toBe("students");
    });

    it("includes 'students_safe' in queryKey when canViewStudentPII is false", async () => {
      mockCanViewStudentPII = false;
      const { useStudents } = await import("../useStudents");
      useStudents();
      const keyObj = capturedOptions.queryKey.find((k: any) => typeof k === "object" && k !== null && "table" in k);
      expect(keyObj.table).toBe("students_safe");
    });

  });

  describe("useStudent", () => {
    it("uses 'students' table when PII is allowed", async () => {
      mockCanViewStudentPII = true;
      const { useStudent } = await import("../useStudents");
      useStudent("s1");
      expect(capturedOptions.queryKey).toContain("students");
      expect(capturedOptions.queryKey).not.toContain("students_safe");
    });

    it("uses 'students_safe' table when PII is restricted", async () => {
      mockCanViewStudentPII = false;
      const { useStudent } = await import("../useStudents");
      useStudent("s1");
      expect(capturedOptions.queryKey).toContain("students_safe");
    });
  });

  describe("useAllStudents", () => {
    it("uses 'students' table when PII is allowed", async () => {
      mockCanViewStudentPII = true;
      const { useAllStudents } = await import("../useStudents");
      useAllStudents();
      expect(capturedOptions.queryKey).toContain("students");
      expect(capturedOptions.queryKey).not.toContain("students_safe");
    });

    it("uses 'students_safe' table when PII is restricted", async () => {
      mockCanViewStudentPII = false;
      const { useAllStudents } = await import("../useStudents");
      useAllStudents();
      expect(capturedOptions.queryKey).toContain("students_safe");
    });
  });

  describe("fetchFilteredStudentsForExport", () => {
    it("queries 'students' when canViewPII is true", async () => {
      const { fetchFilteredStudentsForExport } = await import("../useStudents");
      fromCalls.length = 0;
      await fetchFilteredStudentsForExport("company-1", {}, true);
      expect(fromCalls[0]).toBe("students");
    });

    it("queries 'students_safe' when canViewPII is false", async () => {
      const { fetchFilteredStudentsForExport } = await import("../useStudents");
      fromCalls.length = 0;
      await fetchFilteredStudentsForExport("company-1", {}, false);
      expect(fromCalls[0]).toBe("students_safe");
    });

    it("defaults to 'students' when canViewPII is omitted", async () => {
      const { fetchFilteredStudentsForExport } = await import("../useStudents");
      fromCalls.length = 0;
      await fetchFilteredStudentsForExport("company-1", {});
      expect(fromCalls[0]).toBe("students");
    });
  });
});
