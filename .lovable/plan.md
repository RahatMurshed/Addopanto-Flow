

# Fix Custom Category Delete Button

## Problem

The X (delete) button on custom categories inside the `SelectItem` dropdown doesn't work. This is because Radix UI's `Select` component captures all pointer/click events within `SelectItem` to handle item selection. Even with `e.stopPropagation()`, the Radix internal event handling prevents the button's `onClick` from firing -- clicking the X just selects that category instead.

## Solution

Move custom category management out of the Select dropdown items. Instead:

1. **Remove the X button from inside `SelectItem`** -- it can never work reliably inside Radix Select.
2. **Add a "Manage Categories" option** at the bottom of the dropdown (next to "Add Custom Category") that opens a dialog showing all custom categories with professional delete buttons.
3. **Style the delete button professionally** -- use a subtle trash icon with hover effects and a confirmation step.

## Changes

### File: `src/pages/StudentProfilePage.tsx`

1. **Remove the inline X button** from inside the `SelectItem` map (lines 439-442) -- just show the label text.

2. **Add a "Manage Categories" dialog** with state `showManageCategories`:
   - Lists all custom categories with their color badge
   - Each has a styled trash/X button on the right with hover effect
   - Clicking delete shows inline confirmation ("Delete?" with Yes/No) or directly deletes with toast feedback
   - Only visible to Admin/Cipher users

3. **Add a "Manage Categories" trigger** in the Select dropdown (alongside "Add Custom Category"):
   ```
   Separator
   + Add Custom Category...
   Manage Categories...    (only shown when custom categories exist)
   ```

4. **Apply the same pattern to all 3 category dropdowns** (add note form, edit form, filter bar) -- remove X buttons from all of them, consolidate management into the single dialog.

## UI Design for Manage Categories Dialog

```text
+-------------------------------------+
|  Manage Custom Categories      [X]  |
+-------------------------------------+
|                                     |
|  [Teal Badge] Cold Call     [Trash] |
|  [Pink Badge] Hot Lead      [Trash] |
|                                     |
|  No custom categories yet.          |
|  (shown when list is empty)         |
|                                     |
+-------------------------------------+
```

- Trash button: `ghost` variant, `text-muted-foreground hover:text-destructive` transition
- Each row has the category color swatch + label + delete icon aligned right

## Files Modified

| File | Change |
|------|--------|
| `src/pages/StudentProfilePage.tsx` | Remove inline X buttons from SelectItems; add Manage Categories dialog; add trigger in dropdown |

