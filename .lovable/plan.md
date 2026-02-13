

# Notes Display System

## Current State

After reviewing the codebase, here is where notes/descriptions exist and their display status:

| Area | Field | Currently Displayed? |
|------|-------|---------------------|
| Student payments | `description` | NOT shown in Payment History table |
| Student record | `notes` | Shown as small inline text in header |
| Registration rejections | `rejection_reason` | Already shown in Rejected tab |
| Expenses | `description` | Already shown in table |
| Revenues | `description` | Already shown in table |
| Transfers | `description` | Shown in transfer history cards |

The two main gaps are on the **Student Detail page**.

---

## Changes

### 1. Add "Description" column to Payment History table (StudentDetail.tsx)

Add a new column to the existing Payment History table that shows the payment description/notes. This makes notes visible inline with each payment.

- Add a `Description` table head after the existing columns
- Display the `description` field (or a dash if empty) in each row
- Hidden on small screens, visible on `lg:` breakpoint

### 2. Upgrade Student Notes to a dedicated Card section (StudentDetail.tsx)

Replace the current small inline italic text in the header with a proper "Notes" card that appears between the summary cards and the Monthly Fee Breakdown card.

- Remove the inline `{student.notes && ...}` block from the header (lines 132-137)
- Add a new `Card` with a `StickyNote` icon, amber-themed icon circle, and "Notes" title
- Display the note text with `whitespace-pre-wrap` for multi-line support
- Only renders when `student.notes` exists

### 3. Add "Payment Notes" timeline card (StudentDetail.tsx)

Add a new card section after the Payment History table that collects all payments with non-empty descriptions into a timeline/list view.

- Only renders when at least one payment has a description
- Shows each note as a list item with:
  - Payment date and time
  - Payment type badge (admission/monthly)
  - Amount
  - The note text
- Sorted newest first
- Collapsible via a Collapsible component if more than 5 notes exist (shows first 5, "Show more" toggle for the rest)

---

## Files to Modify

| File | Action |
|------|--------|
| `src/pages/StudentDetail.tsx` | Add Description column to Payment History table, move student notes to card, add Payment Notes timeline card |

## Technical Details

- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from the existing UI components
- Import `MessageSquare` or `FileText` icon from lucide-react for the Payment Notes card
- Filter `payments.filter(p => p.description)` for the timeline
- Use `ChevronDown` icon for the collapsible toggle
- No database changes needed -- all data already exists in the `student_payments.description` and `students.notes` fields

