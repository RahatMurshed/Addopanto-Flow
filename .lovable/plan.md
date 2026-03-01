

# Add "View" Detail Dialog and Show Entry Date in Expense, Revenue, and Transfer History

## Problem
1. The expense history table shows the `date` field (payment/transaction date) but not the actual entry date (`created_at`). Sorting by "Date Newest/Oldest" should sort by entry date, not payment date.
2. There is no "View" button to see full details of a record (who recorded it, payment date vs entry date, etc.).
3. Same issues exist on the Revenue page and Transfer History.

## Solution

### 1. Change displayed date and sort key from `date` to `created_at`

**Expenses (`src/pages/Expenses.tsx`):**
- Table "Date" column: show `created_at` formatted as "MMM d, yyyy h:mm a" (entry date/time)
- Date filtering (`filteredExpenses`): filter by `created_at` instead of `date`
- Sorting: already uses `created_at` as tiebreaker; change primary sort to use `created_at` directly

**Revenue (`src/pages/Revenue.tsx`):**
- Same changes: display `created_at`, filter by `created_at`, sort by `created_at`

**Transfers (`src/components/finance/TransferHistoryCard.tsx`):**
- Already uses `created_at` for display and filtering -- no changes needed for date display
- Add a "View" button (see below)

### 2. Add a "View" detail dialog to all three sections

Create a reusable `RecordDetailDialog` component (`src/components/dialogs/RecordDetailDialog.tsx`) that shows:
- **Entry Date** (created_at) -- when the record was entered
- **Transaction Date** (date) -- the actual payment/transaction date
- **Amount**
- **Source/Account** (expense source or revenue source)
- **Description**
- **Recorded By** -- fetched from `user_profiles` table using `user_id`

The dialog will be a simple Sheet or Dialog with read-only info rows.

**Expenses page:** Add an "Eye" icon button in the Actions column that opens the detail dialog.
**Revenue page:** Same "Eye" icon button.
**Transfer History:** Add an "Eye" icon button per row.

### 3. Fetch recorder profiles

In each page, collect unique `user_id`s from the displayed records and batch-fetch their profiles from `user_profiles` (following the existing pattern used in AuditLog, CompanyMembers, etc.).

## Files to create
- `src/components/dialogs/RecordDetailDialog.tsx` -- reusable view dialog

## Files to modify
- `src/pages/Expenses.tsx` -- change date display/filter/sort to `created_at`, add View button, fetch user profiles
- `src/pages/Revenue.tsx` -- same changes
- `src/components/finance/TransferHistoryCard.tsx` -- add View button with detail dialog

## Technical Details

### RecordDetailDialog component
```text
Props:
  - open: boolean
  - onOpenChange: (open: boolean) => void
  - title: string (e.g. "Expense Details", "Revenue Details", "Transfer Details")
  - fields: Array<{ label: string; value: string | ReactNode }>

Renders a Dialog with a list of label-value pairs in a clean layout.
```

### Date display format
- Table column header renamed to "Entry Date"
- Format: `"MMM d, yyyy h:mm a"` (e.g. "Mar 1, 2026 2:30 PM")
- Transaction/payment date shown inside the View dialog as a separate field

### Sorting changes (Expenses)
```typescript
// Primary sort now uses created_at instead of date
case "date-desc":
  return (b.created_at ?? "").localeCompare(a.created_at ?? "");
case "date-asc":
  return (a.created_at ?? "").localeCompare(b.created_at ?? "");
```

### Date filtering changes
```typescript
// Filter by created_at instead of date
const filteredExpenses = useMemo(() => {
  if (!dateRange) return [];
  return expenses.filter((e) => {
    const entryDate = (e.created_at ?? "").slice(0, 10);
    return entryDate >= dateRange.start && entryDate <= dateRange.end;
  });
}, [expenses, dateRange]);
```

### User profile fetching (follows existing pattern from AuditLog)
```typescript
const userIds = useMemo(() => [...new Set(filteredExpenses.map(e => e.user_id))], [filteredExpenses]);
const { data: userProfiles = [] } = useQuery({
  queryKey: ["expense-user-profiles", userIds],
  queryFn: async () => {
    if (userIds.length === 0) return [];
    const { data } = await supabase.from("user_profiles").select("user_id, full_name, email").in("user_id", userIds);
    return data ?? [];
  },
  enabled: userIds.length > 0,
});
const getRecorderName = (userId: string) => {
  const p = userProfiles.find(p => p.user_id === userId);
  return p?.full_name || p?.email || "Unknown";
};
```

