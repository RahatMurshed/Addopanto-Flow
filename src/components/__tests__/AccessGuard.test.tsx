import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AccessGuard, ACCESS_RULES } from "@/components/auth/AccessGuard";

const mockCompanyContext = {
  isModerator: false,
  canAddRevenue: false,
  canViewRevenue: false,
  canAddStudent: false,
  canEditStudent: false,
  canDeleteStudent: false,
  canAddBatch: false,
  canEditBatch: false,
  canDeleteBatch: false,
};

vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: () => mockCompanyContext,
}));

function renderGuard(rules: Parameters<typeof AccessGuard>[0]["rules"]) {
  return render(
    <MemoryRouter>
      <AccessGuard rules={rules}>
        <div data-testid="protected-content">Protected</div>
      </AccessGuard>
    </MemoryRouter>
  );
}

describe("AccessGuard – /company/members (deoMembers rule)", () => {
  beforeEach(() => {
    Object.assign(mockCompanyContext, {
      isModerator: false,
      canAddRevenue: false,
      canViewRevenue: false,
      canAddStudent: false,
      canEditStudent: false,
      canDeleteStudent: false,
      canAddBatch: false,
      canEditBatch: false,
      canDeleteBatch: false,
    });
  });

  it("allows non-moderator users to see protected content", () => {
    const { getByTestId, queryByText } = renderGuard([ACCESS_RULES.deoMembers]);
    expect(getByTestId("protected-content")).toBeInTheDocument();
    expect(queryByText(/Access Denied/i)).not.toBeInTheDocument();
  });

  it("blocks moderator users and shows permission denied", () => {
    mockCompanyContext.isModerator = true;
    const { queryByTestId, getByText } = renderGuard([ACCESS_RULES.deoMembers]);
    expect(queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(getByText(/Access Denied/i)).toBeInTheDocument();
    expect(getByText(/manage company members/i)).toBeInTheDocument();
  });

  it("shows auto-redirect countdown for moderator on members page", () => {
    mockCompanyContext.isModerator = true;
    const { getByText } = renderGuard([ACCESS_RULES.deoMembers]);
    expect(getByText(/Redirecting to dashboard in/i)).toBeInTheDocument();
  });

  it("shows 'Go to Dashboard' CTA button", () => {
    mockCompanyContext.isModerator = true;
    const { getByRole } = renderGuard([ACCESS_RULES.deoMembers]);
    expect(getByRole("button", { name: /Go to Dashboard/i })).toBeInTheDocument();
  });
});

describe("AccessGuard – multiple rules", () => {
  beforeEach(() => {
    Object.assign(mockCompanyContext, {
      isModerator: false,
      canAddRevenue: false,
      canViewRevenue: false,
    });
  });

  it("blocks when first matching rule denies access", () => {
    mockCompanyContext.isModerator = true;
    const { queryByTestId, getByText } = renderGuard([ACCESS_RULES.deoRevenue, ACCESS_RULES.deoMembers]);
    expect(queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(getByText(/revenue data/i)).toBeInTheDocument();
  });

  it("allows access when moderator has the relevant permission", () => {
    mockCompanyContext.isModerator = true;
    mockCompanyContext.canAddRevenue = true;
    const { getByTestId } = renderGuard([ACCESS_RULES.deoRevenue]);
    expect(getByTestId("protected-content")).toBeInTheDocument();
  });
});
