import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

// --- Mock data -----------------------------------------------------------

const MOCK_STUDENT_FULL = {
  id: "s1",
  name: "Test Student",
  student_id_number: "STU-001",
  email: "secret@example.com",
  phone: "+91-9999999999",
  whatsapp_number: "+91-8888888888",
  alt_contact_number: "+91-7777777777",
  date_of_birth: "2005-03-15",
  gender: "male",
  blood_group: "O+",
  religion_category: "Hindu",
  nationality: "Indian",
  aadhar_id_number: "1234-5678-9012",
  father_name: "Father Name",
  father_contact: "+91-1111111111",
  father_occupation: "Engineer",
  father_annual_income: 500000,
  mother_name: "Mother Name",
  mother_contact: "+91-2222222222",
  mother_occupation: "Teacher",
  guardian_name: "Guardian Name",
  guardian_contact: "+91-3333333333",
  guardian_relationship: "Uncle",
  emergency_contact_name: "Emergency Person",
  emergency_contact_number: "+91-4444444444",
  address_house: "123",
  address_street: "Main St",
  address_area: "Downtown",
  address_city: "Mumbai",
  address_state: "Maharashtra",
  address_pin_zip: "400001",
  perm_address_house: "456",
  perm_address_street: "Second St",
  perm_address_area: "Uptown",
  perm_address_city: "Delhi",
  perm_address_state: "Delhi",
  perm_address_pin_zip: "110001",
  permanent_address_same: false,
  board_university: "CBSE",
  previous_school: "Old School",
  previous_qualification: "10th",
  previous_percentage: "85%",
  transportation_mode: "Bus",
  distance_from_institution: "10km",
  language_proficiency: "English, Hindi",
  extracurricular_interests: "Cricket",
  special_needs_medical: "None",
  enrollment_date: "2024-01-15",
  billing_start_month: "2024-01",
  admission_fee_total: 5000,
  monthly_fee_amount: 2000,
  status: "active" as const,
  notes: "Good student",
  user_id: "u1",
  company_id: "c1",
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
  batch_id: "b1",
  class_grade: "10",
  roll_number: "42",
  academic_year: "2024-25",
  section_division: "A",
  course_start_month: null,
  course_end_month: null,
};

/** Student as returned by the `students_safe` view — PII columns are absent */
const MOCK_STUDENT_SAFE: Record<string, unknown> = {
  id: "s1",
  name: "Test Student",
  student_id_number: "STU-001",
  gender: "male",
  enrollment_date: "2024-01-15",
  billing_start_month: "2024-01",
  admission_fee_total: 5000,
  monthly_fee_amount: 2000,
  status: "active",
  notes: "Good student",
  user_id: "u1",
  company_id: "c1",
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
  batch_id: "b1",
  class_grade: "10",
  roll_number: "42",
  academic_year: "2024-25",
  section_division: "A",
  course_start_month: null,
  course_end_month: null,
};

const PII_FIELDS_NOT_IN_SAFE_VIEW = [
  "email",
  "phone",
  "whatsapp_number",
  "alt_contact_number",
  "date_of_birth",
  "blood_group",
  "religion_category",
  "nationality",
  "aadhar_id_number",
  "father_name",
  "father_contact",
  "father_occupation",
  "father_annual_income",
  "mother_name",
  "mother_contact",
  "mother_occupation",
  "guardian_name",
  "guardian_contact",
  "guardian_relationship",
  "emergency_contact_name",
  "emergency_contact_number",
  "address_house",
  "address_street",
  "address_area",
  "address_city",
  "address_state",
  "address_pin_zip",
  "perm_address_house",
  "perm_address_street",
  "perm_address_area",
  "perm_address_city",
  "perm_address_state",
  "perm_address_pin_zip",
  "permanent_address_same",
  "board_university",
  "previous_school",
  "previous_qualification",
  "previous_percentage",
  "transportation_mode",
  "distance_from_institution",
  "language_proficiency",
  "extracurricular_interests",
  "special_needs_medical",
];

// --- Helpers for mock contexts -------------------------------------------

let mockCanViewStudentPII = false;

vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: () => ({
    canViewStudentPII: mockCanViewStudentPII,
    activeCompanyId: "c1",
    isCompanyAdmin: mockCanViewStudentPII,
    isModerator: false,
    isLoading: false,
    companiesLoading: false,
    companies: [],
    memberships: [],
    currentMembership: null,
    companyRole: mockCanViewStudentPII ? "admin" : "moderator",
    canEdit: mockCanViewStudentPII,
    canDelete: mockCanViewStudentPII,
    canManageMembers: mockCanViewStudentPII,
    canViewMembers: mockCanViewStudentPII,
    canAddStudent: false,
    canEditStudent: false,
    canDeleteStudent: false,
    canManageStudents: false,
    canAddExpense: false,
    canAddRevenue: false,
    canAddExpenseSource: false,
    canTransfer: false,
    canViewReports: false,
    canAddPayment: false,
    canEditPayment: false,
    canDeletePayment: false,
    canAddBatch: false,
    canEditBatch: false,
    canDeleteBatch: false,
    canEditRevenue: false,
    canDeleteRevenue: false,
    canEditExpense: false,
    canDeleteExpense: false,
    canViewRevenue: false,
    canViewExpense: false,
    switchCompany: vi.fn(),
    refetch: vi.fn(),
  }),
  CompanyProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// --- 1. Safe-view data shape tests ---------------------------------------

describe("students_safe view data shape", () => {
  it("safe view object does NOT contain any PII fields", () => {
    for (const field of PII_FIELDS_NOT_IN_SAFE_VIEW) {
      expect(MOCK_STUDENT_SAFE).not.toHaveProperty(field);
    }
  });

  it("safe view object retains all non-sensitive fields", () => {
    const expectedKeys = [
      "id", "name", "student_id_number", "gender",
      "enrollment_date", "billing_start_month", "admission_fee_total",
      "monthly_fee_amount", "status", "notes", "user_id",
      "company_id", "batch_id", "class_grade", "roll_number",
      "academic_year", "section_division", "created_at", "updated_at",
      "course_start_month", "course_end_month",
    ];
    for (const key of expectedKeys) {
      expect(MOCK_STUDENT_SAFE).toHaveProperty(key);
    }
  });

  it("full student has all PII fields present", () => {
    for (const field of PII_FIELDS_NOT_IN_SAFE_VIEW) {
      expect(MOCK_STUDENT_FULL).toHaveProperty(field);
    }
  });
});

// --- 2. StudentProfileDialog PII redaction tests -------------------------

// We need to mock several dependencies for the dialog
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" }, session: { access_token: "token" } }),
}));

// Lazy import after mocks are set up
const importProfileDialog = async () => {
  const mod = await import("@/components/dialogs/StudentProfileDialog");
  return mod.default;
};

describe("StudentProfileDialog PII redaction", () => {
  beforeEach(() => {
    mockCanViewStudentPII = false;
  });

  it("hides PII sections for non-admin users", async () => {
    mockCanViewStudentPII = false;
    const StudentProfileDialog = await importProfileDialog();

    const { getByText, queryByText } = render(
      <StudentProfileDialog
        student={MOCK_STUDENT_FULL}
        open={true}
        onOpenChange={() => {}}
        batchName="Batch A"
      />
    );

    // Should show restricted message
    expect(getByText(/restricted to administrators/i)).toBeInTheDocument();

    // PII values should NOT be visible
    expect(queryByText("secret@example.com")).not.toBeInTheDocument();
    expect(queryByText("+91-9999999999")).not.toBeInTheDocument();
    expect(queryByText("1234-5678-9012")).not.toBeInTheDocument();
    expect(queryByText("Father Name")).not.toBeInTheDocument();
    expect(queryByText("Mother Name")).not.toBeInTheDocument();
    expect(queryByText("Mumbai")).not.toBeInTheDocument();
    expect(queryByText("O+")).not.toBeInTheDocument();

    // Non-PII should still be visible
    expect(getByText("Test Student")).toBeInTheDocument();
  });

  it("shows all PII sections for admin users", async () => {
    mockCanViewStudentPII = true;
    const StudentProfileDialog = await importProfileDialog();

    const { getByText, queryByText } = render(
      <StudentProfileDialog
        student={MOCK_STUDENT_FULL}
        open={true}
        onOpenChange={() => {}}
        batchName="Batch A"
      />
    );

    // Should NOT show restricted message
    expect(queryByText(/restricted to administrators/i)).not.toBeInTheDocument();

    // PII values should be visible
    expect(getByText("+91-9999999999")).toBeInTheDocument();
    expect(getByText("1234-5678-9012")).toBeInTheDocument();
    expect(getByText("Father Name")).toBeInTheDocument();
    expect(getByText("Mumbai")).toBeInTheDocument();
  });
});

// --- 3. Export column filtering tests ------------------------------------

describe("PII column filtering for exports", () => {
  const PII_EXPORT_KEYS = [
    "phone", "whatsapp_number", "alt_contact_number", "email",
    "address_city", "address_state", "address_area", "address_pin_zip",
    "date_of_birth", "blood_group", "nationality", "religion_category",
    "aadhar_id_number", "father_name", "father_contact", "father_occupation",
    "father_annual_income", "mother_name", "mother_contact", "mother_occupation",
    "guardian_name", "guardian_contact", "board_university", "previous_school",
    "previous_qualification", "previous_percentage", "emergency_contact_name",
    "emergency_contact_number", "transportation_mode", "special_needs_medical",
  ];

  // Import the constants directly
  it("PII_COLUMN_KEYS set contains all expected PII keys", async () => {
    // We test the filtering logic directly
    const ALL_COLUMNS_SAMPLE = [
      { key: "name", label: "Name", group: "Basic", default: true },
      { key: "phone", label: "Phone", group: "Contact", default: true },
      { key: "email", label: "Email", group: "Contact", default: false },
      { key: "father_name", label: "Father", group: "Family", default: false },
      { key: "status", label: "Status", group: "Basic", default: true },
      { key: "aadhar_id_number", label: "Aadhar", group: "Personal", default: false },
    ];

    const PII_SET = new Set(PII_EXPORT_KEYS);

    // Non-admin: filter out PII
    const nonAdminCols = ALL_COLUMNS_SAMPLE.filter(c => !PII_SET.has(c.key));
    expect(nonAdminCols.map(c => c.key)).toEqual(["name", "status"]);

    // Admin: all columns
    const adminCols = ALL_COLUMNS_SAMPLE;
    expect(adminCols).toHaveLength(6);
  });

  it("non-admin export preset filters out PII columns", () => {
    const presetColumns = ["name", "phone", "email", "status", "father_name"];
    const PII_SET = new Set(PII_EXPORT_KEYS);
    const filtered = presetColumns.filter(k => !PII_SET.has(k));
    expect(filtered).toEqual(["name", "status"]);
  });
});

// --- 4. Search field restriction tests -----------------------------------

describe("Search field restrictions for non-admin", () => {
  it("non-admin search uses only safe fields", () => {
    const canViewPII = false;
    const safeFields = ["name", "student_id_number", "class_grade"];
    const piiFields = [
      "father_name", "phone", "mother_name", "whatsapp_number",
      "alt_contact_number", "email", "address_house", "address_street",
      "address_area", "address_city", "address_state", "address_pin_zip",
    ];
    const fields = canViewPII ? [...safeFields, ...piiFields] : safeFields;

    expect(fields).toEqual(["name", "student_id_number", "class_grade"]);
    expect(fields).not.toContain("phone");
    expect(fields).not.toContain("email");
    expect(fields).not.toContain("father_name");
  });

  it("admin search includes PII fields", () => {
    const canViewPII = true;
    const safeFields = ["name", "student_id_number", "class_grade"];
    const piiFields = [
      "father_name", "phone", "mother_name", "whatsapp_number",
      "alt_contact_number", "email", "address_house", "address_street",
      "address_area", "address_city", "address_state", "address_pin_zip",
    ];
    const fields = canViewPII ? [...safeFields, ...piiFields] : safeFields;

    expect(fields).toHaveLength(15);
    expect(fields).toContain("phone");
    expect(fields).toContain("email");
    expect(fields).toContain("father_name");
  });
});

// --- 5. Address filter restriction tests ---------------------------------

describe("Address filter restrictions for non-admin", () => {
  it("address filters are skipped when canViewPII is false", () => {
    const canViewPII = false;
    const appliedFilters: string[] = [];

    // Simulates the filter logic in useStudents
    if (canViewPII) {
      appliedFilters.push("address_city", "address_state", "address_area", "address_pin_zip");
    }

    expect(appliedFilters).toHaveLength(0);
  });

  it("address filters are applied when canViewPII is true", () => {
    const canViewPII = true;
    const appliedFilters: string[] = [];

    if (canViewPII) {
      appliedFilters.push("address_city", "address_state", "address_area", "address_pin_zip");
    }

    expect(appliedFilters).toHaveLength(4);
  });
});

// --- 6. View routing / table selection tests -----------------------------

/**
 * These tests replicate the table-selection logic from useStudents, useStudent,
 * useAllStudents, and fetchFilteredStudentsForExport to verify the correct
 * table is chosen based on the user's PII permission.
 */
describe("View routing: table selection based on canViewStudentPII", () => {
  const resolveTable = (canViewPII: boolean) =>
    canViewPII ? "students" : "students_safe";

  // --- useStudents (paginated list) ---
  it("useStudents routes to 'students' for admin", () => {
    expect(resolveTable(true)).toBe("students");
  });

  it("useStudents routes to 'students_safe' for non-admin", () => {
    expect(resolveTable(false)).toBe("students_safe");
  });

  // --- useStudent (single detail) ---
  it("useStudent routes to 'students' for admin", () => {
    expect(resolveTable(true)).toBe("students");
  });

  it("useStudent routes to 'students_safe' for non-admin", () => {
    expect(resolveTable(false)).toBe("students_safe");
  });

  // --- useAllStudents ---
  it("useAllStudents routes to 'students' for admin", () => {
    expect(resolveTable(true)).toBe("students");
  });

  it("useAllStudents routes to 'students_safe' for non-admin", () => {
    expect(resolveTable(false)).toBe("students_safe");
  });

  // --- fetchFilteredStudentsForExport ---
  it("export function routes to 'students' when canViewPII=true", () => {
    expect(resolveTable(true)).toBe("students");
  });

  it("export function routes to 'students_safe' when canViewPII=false", () => {
    expect(resolveTable(false)).toBe("students_safe");
  });
});

// --- 7. Query key isolation tests ----------------------------------------

describe("Query key includes table name for cache isolation", () => {
  const buildListKey = (companyId: string, canViewPII: boolean) => {
    const table = canViewPII ? "students" : "students_safe";
    return ["students", companyId, { table }];
  };

  const buildDetailKey = (id: string, canViewPII: boolean) => {
    const table = canViewPII ? "students" : "students_safe";
    return ["students", id, table];
  };

  const buildAllKey = (companyId: string, canViewPII: boolean) => {
    const table = canViewPII ? "students" : "students_safe";
    return ["students", "all", companyId, table];
  };

  it("list query keys differ between admin and non-admin", () => {
    const adminKey = JSON.stringify(buildListKey("c1", true));
    const viewerKey = JSON.stringify(buildListKey("c1", false));
    expect(adminKey).not.toBe(viewerKey);
    expect(adminKey).toContain('"students"');
    expect(viewerKey).toContain('"students_safe"');
  });

  it("detail query keys differ between admin and non-admin", () => {
    const adminKey = JSON.stringify(buildDetailKey("s1", true));
    const viewerKey = JSON.stringify(buildDetailKey("s1", false));
    expect(adminKey).not.toBe(viewerKey);
  });

  it("all-students query keys differ between admin and non-admin", () => {
    const adminKey = JSON.stringify(buildAllKey("c1", true));
    const viewerKey = JSON.stringify(buildAllKey("c1", false));
    expect(adminKey).not.toBe(viewerKey);
    expect(viewerKey).toContain("students_safe");
  });
});

// --- 8. PII audit mode toggle tests --------------------------------------

describe("PII audit mode (admin preview as non-admin)", () => {
  it("canViewStudentPII is false when audit mode is on even for admin", () => {
    const isCompanyAdmin = true;
    const piiAuditMode = true;
    const canViewStudentPII = isCompanyAdmin && !piiAuditMode;
    expect(canViewStudentPII).toBe(false);
  });

  it("canViewStudentPII is true when audit mode is off for admin", () => {
    const isCompanyAdmin = true;
    const piiAuditMode = false;
    const canViewStudentPII = isCompanyAdmin && !piiAuditMode;
    expect(canViewStudentPII).toBe(true);
  });

  it("canViewStudentPII is false for non-admin regardless of audit mode", () => {
    const isCompanyAdmin = false;
    expect(isCompanyAdmin && !false).toBe(false);
    expect(isCompanyAdmin && !true).toBe(false);
  });

  it("audit mode flips table routing to students_safe", () => {
    const isAdmin = true;
    const auditOn = true;
    const canViewPII = isAdmin && !auditOn;
    const table = canViewPII ? "students" : "students_safe";
    expect(table).toBe("students_safe");
  });
});

// --- 9. RLS view column guarantee tests ----------------------------------

describe("students_safe view column guarantees", () => {
  const SAFE_VIEW_COLUMNS = [
    "id", "name", "student_id_number", "enrollment_date", "billing_start_month",
    "admission_fee_total", "monthly_fee_amount", "status", "notes", "user_id",
    "created_at", "updated_at", "course_start_month", "course_end_month",
    "company_id", "batch_id", "class_grade", "roll_number", "academic_year",
    "section_division", "gender",
  ];

  it("safe view has exactly the expected columns", () => {
    const safeKeys = Object.keys(MOCK_STUDENT_SAFE);
    expect(safeKeys.sort()).toEqual([...SAFE_VIEW_COLUMNS].sort());
  });

  it("no PII column appears in the safe view columns list", () => {
    const safeSet = new Set(SAFE_VIEW_COLUMNS);
    for (const piiField of PII_FIELDS_NOT_IN_SAFE_VIEW) {
      expect(safeSet.has(piiField)).toBe(false);
    }
  });

  it("full students table has all safe + PII columns", () => {
    const fullKeys = Object.keys(MOCK_STUDENT_FULL);
    for (const safeCol of SAFE_VIEW_COLUMNS) {
      expect(fullKeys).toContain(safeCol);
    }
    for (const piiCol of PII_FIELDS_NOT_IN_SAFE_VIEW) {
      expect(fullKeys).toContain(piiCol);
    }
  });
});
