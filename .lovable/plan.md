

# Add Delete Product Category Feature

## Overview
The `useDeleteProductCategory` hook already exists and is imported but unused. Category cards currently have no delete option. This plan adds a delete button on each category card (for admins) with a confirmation dialog.

## Changes

### File: `src/pages/Products.tsx`

1. **Add state for category deletion**: Add `deleteCategoryId` state variable to track which category is being deleted.

2. **Add delete button to category cards**: On each category card (lines 165-184), add a small delete (trash) icon button in the top-right corner, visible only to admin users. This button will set `deleteCategoryId` to trigger the confirmation dialog. System categories (`is_system: true`) will not show the delete button.

3. **Add confirmation AlertDialog for category deletion**: Add a second `AlertDialog` (after the existing product delete one) that warns the user about deleting the category and confirms the action. On confirm, call `deleteCategory.mutateAsync(deleteCategoryId)`.

4. **Wire up `useDeleteProductCategory`**: Initialize the `useDeleteProductCategory` hook (already imported) and use it in the delete handler.

5. **Add edit button to category cards**: While we're at it, add an edit (pencil) icon button next to delete so admins can edit categories directly from the card (currently only accessible via the Settings2 button in the header). This opens the existing `ProductCategoryDialog` with the selected category.

## Technical Details

- The `useDeleteProductCategory` hook is already defined in `src/hooks/useProductCategories.ts` and imported in Products.tsx -- just needs to be called
- Category cards will get a small action overlay (edit + delete icons) visible on hover or always for mobile, only for admin users
- Non-system categories only (`is_system === false`) can be deleted
- If a category has products assigned to it, the delete will either fail at the DB level (if FK constraint exists) or succeed -- the confirmation dialog will warn about this
