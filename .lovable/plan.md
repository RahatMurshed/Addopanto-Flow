

# Add Custom Category Feature for Sales Notes

## Problem

Currently, note categories are hardcoded in `NOTE_CATEGORIES` array. Users cannot create their own custom categories for sales/follow-up notes, limiting flexibility.

## Solution

Create a `sales_note_categories` database table to store company-specific custom categories. Merge them with the existing default categories in the UI. Users (Admin/Cipher) can add and delete custom categories directly from the category dropdown.

## Changes

### 1. Database Migration -- New `sales_note_categories` table

Create table with columns:
- `id` (uuid, PK)
- `company_id` (uuid, FK to companies)
- `label` (text, NOT NULL) -- display name
- `value` (text, NOT NULL) -- slug/key
- `color_class` (text) -- Tailwind color classes
- `created_by` (uuid, FK to auth.users)
- `created_at` (timestamptz)

RLS: Company members can SELECT; Admin/Cipher can INSERT/DELETE.
Unique constraint on `(company_id, value)` to prevent duplicates.

### 2. `src/hooks/useStudentSalesNotes.ts` -- Add custom category hooks

- Add `useCustomNoteCategories(companyId)` hook to fetch custom categories
- Add `useCreateCustomCategory()` mutation
- Add `useDeleteCustomCategory()` mutation
- Update `getCategoryInfo()` to accept custom categories as a parameter
- Keep `NOTE_CATEGORIES` as the default/built-in list

### 3. `src/pages/StudentProfilePage.tsx` -- Update UI

- Fetch custom categories using the new hook
- Merge default + custom categories into `allCategories` list
- In the category Select dropdowns (add note form, edit form, filter bar):
  - Show all categories (defaults + custom)
  - Add a separator and "Add Custom Category..." option at the bottom (visible to Admin/Cipher only)
- Clicking "Add Custom Category..." opens a small inline dialog/popover with:
  - Text input for category name
  - Color picker (preset color options as clickable swatches)
  - Save button
- Custom categories show a delete (X) icon next to them in the dropdown (Admin/Cipher only)
- Custom category badges use the stored color class

## Technical Details

- **Security:** RLS ensures company-level isolation. Only Admin/Cipher can create/delete custom categories.
- **Edge cases:** Deleting a custom category does NOT delete notes using that category -- they'll fall back to "General Note" styling via `getCategoryInfo`.
- **Patterns:** Follows existing hook patterns with React Query invalidation.
- **Color presets:** 8 preset color combinations (teal, pink, indigo, amber, emerald, rose, cyan, lime) to choose from when creating a custom category.

## Testing Checklist

| # | Test | Expected Result |
|---|------|----------------|
| 1 | Admin creates a custom category | Category appears in all dropdowns |
| 2 | User creates a note with custom category | Note saves with custom category badge |
| 3 | Admin deletes a custom category | Category removed from dropdowns; existing notes show fallback style |
| 4 | Non-admin user | Cannot see "Add Custom Category" option |
| 5 | Filter by custom category | Notes filtered correctly |

## Files Modified

- New migration for `sales_note_categories` table
- `src/hooks/useStudentSalesNotes.ts`
- `src/pages/StudentProfilePage.tsx`

