

## Add Role Selection When Approving Join Requests

Currently, all approved join requests default to the "Moderator" role. This change lets the admin pick a role (Moderator, Data Entry Operator, or Viewer) before approving, and shows the correct permission toggles for each role.

---

### What Changes

**1. Frontend -- `src/components/CompanyJoinRequests.tsx`**

- Add a `role` field to the `ApproveData` interface (default: `"moderator"`)
- Add a role selector (dropdown) at the top of the approval dialog, above the permission toggles
- Conditionally render permission toggles:
  - **Moderator**: show the existing 6 legacy toggles (revenue, expense, expense source, transfer, reports, students)
  - **Data Entry Operator**: show DEO category toggles (students, payments, batches, finance)
  - **Viewer**: no permission toggles (read-only)
- Send the selected `role` in the mutation payload to the edge function
- Update dialog description text to reflect the chosen role (e.g., "They will be added as a **Moderator**" changes dynamically)
- Apply the same changes to the "accept rejected" dialog

**2. Backend -- `supabase/functions/company-join/index.ts`**

- Add `role` field to `approveJoinSchema` and `acceptRejectedSchema` (validated as one of `moderator`, `data_entry_operator`, `viewer`; defaults to `moderator`)
- In the `approve-join-request` and `accept-rejected-join-request` handlers, use the submitted `role` instead of hardcoded `"moderator"`
- When role is `data_entry_operator`, map permissions to `deo_students`, `deo_payments`, `deo_batches`, `deo_finance` columns
- When role is `viewer`, ignore permissions entirely (all default to false)

---

### Technical Details

**ApproveData interface update:**
```typescript
interface ApproveData {
  request: JoinRequest;
  email: string;
  role: "moderator" | "data_entry_operator" | "viewer";
  // moderator permissions
  canAddRevenue: boolean;
  canAddExpense: boolean;
  canAddExpenseSource: boolean;
  canTransfer: boolean;
  canViewReports: boolean;
  canManageStudents: boolean;
  // DEO permissions
  deoStudents: boolean;
  deoPayments: boolean;
  deoBatches: boolean;
  deoFinance: boolean;
}
```

**Edge function schema update:**
```typescript
const approveJoinSchema = z.object({
  action: z.literal("approve-join-request"),
  requestId: uuidField,
  companyId: uuidField,
  role: z.enum(["moderator", "data_entry_operator", "viewer"]).default("moderator"),
  permissions: permissionsSchema,
});
```

**Membership insert logic** (edge function):
- For `moderator`: set legacy `can_*` fields from permissions
- For `data_entry_operator`: set `deo_students`, `deo_payments`, `deo_batches`, `deo_finance` from permissions
- For `viewer`: insert with all permissions false

**UI role selector** -- a `Select` dropdown placed between the dialog description and the permission toggles, with options: Moderator, Data Entry Operator, Viewer. Changing role resets the permission toggles to defaults for that role.

