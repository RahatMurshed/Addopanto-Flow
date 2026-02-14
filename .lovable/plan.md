

## Fix Backup/Restore, Settings Access, and PDF Export

### Issue 1: Backup and Restore Data Problems

**Root cause:** The backup system was built for single-tenant (user-level) data but the app is now multi-tenant (company-level).

**Current bugs:**
- Export queries filter by `user_id` instead of `company_id`, so it exports data from ALL companies the user belongs to, not just the active one
- Backup does not include students, student_payments, monthly_fee_history, or batches -- these tables exist and have data but are completely missing from backup/restore
- The restore process creates records in the active company, but the exported data might be from a different company
- The reset warning dialog doesn't mention students/batches being deleted (but the code does delete them)

**Fix plan:**
- Update `exportUserData()` in `src/utils/dataBackupUtils.ts` to accept `companyId` and filter all queries by `company_id` instead of `user_id`
- Add `students`, `student_payments`, `monthly_fee_history`, and `batches` to the `BackupData` interface and export/import logic
- Update `useDataManagement.ts` to pass `activeCompanyId` to the export function
- Update `restoreData()` to handle the new tables (batches first, then students with batch ID mapping, then student_payments and monthly_fee_history with student ID mapping)
- Update `BackupPreview` to show counts for the new tables
- Update `RestoreDataDialog` to show the new table counts
- Update `ResetDataDialog` warning to mention students and batches
- Bump backup version to "2.0" while keeping backward compatibility with "1.0" backups (the new tables would just be empty arrays)
- Update `validateBackupData` to accept both version "1.0" and "2.0"

### Issue 2: Settings Page Access Control

**Current state:** The Settings page already redirects non-admin/non-cipher users (lines 60-64 in SettingsPage.tsx), and the nav hides the Settings link for non-admin/cipher users (AppLayout line 71). This is working correctly.

**Improvement:** Add a `RoleGuard` wrapper in the route or at the top of the page component for defense-in-depth, showing a proper "Access Denied" message instead of a silent redirect.

**Fix plan:**
- Wrap the Settings page content in `SettingsPage.tsx` with the existing redirect logic (keep as-is, it works)
- No route-level change needed since the redirect is fast and the nav already hides the link

### Issue 3: PDF Export Quality

**Current bugs:**
- All buttons and links inside the export area are hidden, including pagination controls -- this means paginated tables only export the current visible page, not all data
- The 100ms delay for dark-to-light theme switch may not be enough for recharts to re-render
- `StudentOverdueSection` uses `formatCurrency` directly (no exchange rate conversion) for both display and PDF
- High canvas scale (3x) can cause memory issues and slow exports on large pages
- Charts (recharts) use SVG which html2canvas handles poorly, leading to missing or broken chart visuals in PDFs

**Fix plan:**

1. **Improve theme switch timing** in `exportToPDF()`:
   - Increase the delay from 100ms to 300ms to allow recharts SVGs and CSS transitions to fully reflow

2. **Reduce canvas scale** from 3 to 2:
   - Still high quality but much less memory usage; prevents crashes on large dashboard pages

3. **Fix `StudentOverdueSection`** to use `useCompanyCurrency` hook instead of direct `formatCurrency` import, so amounts display correctly with exchange rate conversion (affects both screen and PDF)

4. **Add `data-pdf-hide` attribute** to pagination controls across pages so they're properly hidden during PDF export without hiding the actual table content

5. **Improve button hiding logic** in `exportToPDF`:
   - Only hide elements with `[data-pdf-hide]` attribute instead of ALL buttons -- this prevents hiding column headers or interactive elements that look like buttons but are actually content
   - Keep hiding `a[href]` links

### Files to modify:
- `src/utils/dataBackupUtils.ts` -- add company-scoped export, add new tables, version 2.0
- `src/utils/exportUtils.ts` -- fix PDF export quality (scale, timing, selector logic)
- `src/hooks/useDataManagement.ts` -- pass companyId to export, handle new tables in restore
- `src/components/RestoreDataDialog.tsx` -- show new table counts in preview
- `src/components/ResetDataDialog.tsx` -- update warning text to include students/batches
- `src/components/StudentOverdueSection.tsx` -- use `useCompanyCurrency` hook
- `src/pages/Expenses.tsx` -- add `data-pdf-hide` to pagination
- `src/pages/Revenue.tsx` -- add `data-pdf-hide` to pagination
- `src/pages/Reports.tsx` -- add `data-pdf-hide` to pagination
- `src/pages/Dashboard.tsx` -- add `data-pdf-hide` to pagination (if applicable)

### Technical Details

**Updated BackupData interface:**
```text
interface BackupData {
  version: string;  // "1.0" or "2.0"
  exportedAt: string;
  userEmail: string;
  companyName?: string;  // new in 2.0
  data: {
    expense_accounts: any[];
    revenue_sources: any[];
    revenues: any[];
    allocations: any[];
    expenses: any[];
    khata_transfers: any[];
    // New in 2.0:
    batches: any[];
    students: any[];
    student_payments: any[];
    monthly_fee_history: any[];
  };
}
```

**Updated exportUserData signature:**
```text
async function exportCompanyData(companyId: string): Promise<BackupData["data"]>
// All queries use .eq("company_id", companyId) instead of .eq("user_id", userId)
```

**Restore order for new tables (respecting foreign keys):**
1. batches (no FK deps within backup)
2. students (FK to batches via batch_id)
3. student_payments (FK to students via student_id)
4. monthly_fee_history (FK to students via student_id)

**Updated PDF export selectors:**
```text
// Before (too aggressive):
['button', '[role="button"]', '.action-buttons', '[data-pdf-hide]', 'a[href]']

// After (targeted):
['[data-pdf-hide]', '.action-buttons']
```

