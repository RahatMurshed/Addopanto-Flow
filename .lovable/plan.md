

## Fix: DEO Can't Add Expenses — No Expense Sources in Company

### What's Happening

The Data Entry Operator (DEO) has the correct "Add Expenses" permission (`deo_finance = true`). The problem is **the company has no expense sources (accounts) configured**. Without at least one expense source, the "Add Expense" button is disabled for everyone — including admins.

The current alert says "Create expense sources first before recording expenses" but the DEO has no ability to create expense sources (that's admin-only). This creates a confusing experience.

### What Needs to Happen

**Step 1 (Admin action needed):** An admin must go to the **Expense Sources** page (`/khatas`) and create at least one expense account/source. This is required before anyone can record expenses.

**Step 2 (Code fix):** Improve the empty-state message on the Expenses page so DEO moderators see a more helpful message instead of being told to create something they can't.

### Code Change

**File: `src/pages/Expenses.tsx`** — Update the "no accounts" alert to show a different message for moderators:

- Current: "Create expense sources first before recording expenses."
- For moderators: "No expense sources have been configured yet. Ask your admin to set up expense sources before you can record expenses."
- For admins: Keep the current message with a link/suggestion to go to Expense Sources.

### Summary

| Issue | Cause | Fix |
|-------|-------|-----|
| "Add Expense" button disabled | Company has 0 expense accounts | Admin must create expense accounts first |
| Confusing alert for DEO | Same message shown to all roles | Show role-appropriate message |
