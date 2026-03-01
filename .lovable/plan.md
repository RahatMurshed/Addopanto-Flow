

# Clean Up Salary Descriptions + Outlined Badges in Light Mode

## 1. Strip `[SALARY:uuid]` from displayed descriptions

The internal tracking tag `[SALARY:cb284cc9-...]` is visible in the UI on both the Dashboard and Expenses pages. We'll create a small utility function to clean descriptions for display, stripping the `[SALARY:...]` suffix while keeping it in the database for tracking.

**Approach:**
- Create a utility function `cleanDescription(desc: string)` that removes `[SALARY:uuid]` patterns using a regex
- Apply it in the two places descriptions are shown:
  - `Dashboard.tsx` (line ~196 where expense descriptions are built, and line ~1030 where `tx.description` is rendered)
  - `Expenses.tsx` (line ~595 where `exp.description` is rendered)

**The regex:** `/\s*\[SALARY:[^\]]+\]/g` -- removes the tag and any leading whitespace before it.

## 2. Outlined badges in light mode (no background, just border)

The user wants all source badges across the app to have no background color in light mode -- just a border and colored text. This is controlled by `getSourceColor()` in `src/utils/sourceColors.ts`.

**Current light mode style:**
```
bg: "transparent", text: hsl(hue, 85%, 40%), border: hsla(hue, 85%, 45%, 0.30)
```

This is already transparent background. However, the `Badge` component (`badge.tsx`) has a `default` variant that applies `bg-primary` styles and dark mode uses `dark:bg-primary`. The issue is likely that in some places badges use the `default` variant instead of `outline`.

**Changes:**
- Verify and update `sourceColors.ts` -- light mode already uses `transparent` bg, which is correct
- Update the `Badge` component's `default` variant to use an outlined style in light mode (border + no bg), keeping filled style only for dark mode -- this is actually already done based on the code
- Make the border more visible in light mode by increasing border opacity from 0.30 to 0.45 for better visibility

## Files to modify

1. **New utility:** Add `cleanSalaryTag()` to `src/utils/sourceColors.ts` (or a new small util)
2. **`src/pages/Dashboard.tsx`** -- Clean description display at line ~196 and ~1030
3. **`src/pages/Expenses.tsx`** -- Clean description display at line ~595
4. **`src/utils/sourceColors.ts`** -- Increase border opacity for light mode badges

## Technical Details

The `cleanSalaryTag` function:
```typescript
export function cleanSalaryTag(desc: string | null | undefined): string {
  if (!desc) return "";
  return desc.replace(/\s*\[SALARY:[^\]]+\]/g, "").trim();
}
```

Applied in Dashboard.tsx where expense transactions build their description (line ~196) and in the render (line ~1030), and in Expenses.tsx where `exp.description` is displayed (line ~595).

For badges, increase the border opacity in `getSourceColor()` light mode from `0.30` to `0.50` so the outline is more prominent and the badge looks clearly "outlined."
