
# Plan: Rename "Khata" to "Expense Source" Throughout the App

## Overview

This plan renames all user-facing instances of "Khata" to "Expense Source" across the entire application for consistent terminology. Note that the app name "KhataFlow" and internal code references (variable names, database table names, file names) will remain unchanged to avoid breaking functionality.

---

## Scope of Changes

### What Will Be Changed
- All **user-facing text** (labels, headings, descriptions, placeholders, toast messages, alerts)
- Table column headers
- Button labels
- Dialog titles and descriptions
- Navigation menu labels

### What Will NOT Be Changed
- The app name "KhataFlow" (brand name)
- File names (e.g., `KhataDialog.tsx`, `useKhataTransfers.ts`)
- Variable names, function names, type names in code
- Database table names (e.g., `khata_transfers`)
- Query keys and internal identifiers

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/AppLayout.tsx` | Nav item label: "Khatas" → "Expense Sources" |
| `src/pages/Khatas.tsx` | Page title, descriptions, button labels, toast messages, dialog references |
| `src/components/KhataDialog.tsx` | Dialog titles: "Edit Khata" → "Edit Expense Source", button labels |
| `src/pages/Expenses.tsx` | Table header, descriptions, card titles mentioning "Khata" |
| `src/pages/Revenue.tsx` | Descriptions mentioning "khatas" |
| `src/pages/Reports.tsx` | Chart labels, card titles mentioning "Khata" |
| `src/pages/Dashboard.tsx` | Table column header: "Khata" → "Expense Source" |
| `src/components/TransferDialog.tsx` | Labels: "From Khata" → "From Expense Source", descriptions |
| `src/components/ExpenseDialog.tsx` | Labels and placeholders mentioning "khata" |
| `src/components/ResetDataDialog.tsx` | List items mentioning "Khatas" and "khata transfers" |

---

## Detailed Changes by File

### 1. `src/components/AppLayout.tsx`
```text
Line 21: { label: "Khatas", href: "/khatas", icon: Wallet }
       → { label: "Expense Sources", href: "/khatas", icon: Wallet }
```

### 2. `src/pages/Khatas.tsx`
- Line 52: Toast: "Khata created" → "Expense source created"
- Line 63: Toast: "Khata updated" → "Expense source updated"
- Line 75: Toast: "Khata deleted" → "Expense source deleted"
- Line 85: Toast: "Default khatas created" → "Default expense sources created"
- Line 103: Page title: "Expense Accounts (Khatas)" → "Expense Sources"
- Line 123: Button: "Add Khata" → "Add Expense Source"
- Line 153: Text: "Create khatas to..." → "Create expense sources to..."
- Line 268: Dialog title: "Delete this khata?" → "Delete this expense source?"

### 3. `src/components/KhataDialog.tsx`
- Line 86: Dialog title: "Edit Khata" / "Create Khata" → "Edit Expense Source" / "Create Expense Source"
- Line 184: Button: "Create Khata" → "Create Expense Source"

### 4. `src/pages/Expenses.tsx`
- Line 210: Description: "...by khata" → "...by expense source"
- Line 242: Alert: "...expense accounts (khatas)..." → "...expense sources..."
- Line 315: Card title: "Spending by Khata" → "Spending by Expense Source"
- Line 347: Card title: "Khata Balances" → "Expense Source Balances"
- Line 395: Text: "...selected khata's balance" → "...selected expense source's balance"
- Line 415: Table header: "Khata" → "Expense Source"

### 5. `src/pages/Revenue.tsx`
- Line 149: Toast: "...allocated to X khatas" → "...allocated to X expense sources"
- Line 202: Description: "...allocate to khatas" → "...allocate to expense sources"
- Line 226: Alert: "No active khatas!" → "No active expense sources!"
- Line 326: Text: "...your active khatas" → "...your active expense sources"
- Line 431: Alert: "...allocations to khatas" → "...allocations to expense sources"

### 6. `src/pages/Reports.tsx`
- Line 419: Variable for tooltip uses "expenseByKhata" (internal - keep)
- Chart labels/titles containing "Khata" → "Expense Source"

### 7. `src/pages/Dashboard.tsx`
- Line 630: Table header: "Khata" → "Expense Source"

### 8. `src/components/TransferDialog.tsx`
- Line 109-110: Description: "Move funds between khatas..." → "Move funds between expense sources..."
- Line 117: Label: "From Khata" → "From Expense Source"
- Line 119: Placeholder: "Select source khata" → "Select source expense source" → Better: "Select source"
- Line 143: Label: "To Khata" → "To Expense Source"
- Line 146: Placeholder: "Select destination khata" → "Select destination"
- Line 174: Alert: "...same khata" → "...same expense source"

### 9. `src/components/ExpenseDialog.tsx`
- Line 36: Validation message: "Please select a khata" → "Please select an expense source"
- Line 107: Description: "...from one of your khatas" → "...from one of your expense sources"
- Line 113: Label: "Khata (Expense Account)" → "Expense Source"
- Line 119: Placeholder: "Select a khata" → "Select an expense source"

### 10. `src/components/ResetDataDialog.tsx`
- Line 110: "All expense accounts (Khatas)" → "All expense sources"
- Line 111: "All khata transfers" → "All expense source transfers"

---

## Summary

| Category | Count |
|----------|-------|
| Files to modify | 10 |
| Text changes | ~35 individual text updates |
| Preserved items | App name "KhataFlow", all code internals, database tables, file names |

---

## Expected Result

After this change, users will see consistent "Expense Source" terminology throughout the app while the underlying code structure and database remain stable. The URL `/khatas` will still work, but the navigation will display "Expense Sources".
