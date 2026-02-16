

## Make Revenue/Expense Source Badges Match Enrollment Column Style

### What Changes
Update the source badge styling to match the enrollment column's highlighted pill look (`bg-color/15 text-color border-color/30`) — a soft, semi-transparent tinted background with a matching border and text, different color per source.

### Technical Details

**File: `src/utils/sourceColors.ts`**

Update the `getSourceColor` function to produce colors using the same opacity-based pattern as the enrollment badges:

- **Light mode**: Use `hsla()` with alpha transparency for background (15% opacity) and border (30% opacity), with a solid medium-dark text color — matching the `bg-green-500/15 text-green-700 border-green-500/30` pattern but with the deterministic hue per source.
- **Dark mode**: Keep as-is (no changes).
- **Uncategorized (light)**: Use a neutral gray version of the same pattern.

The updated light-mode values will be:
```
bg:     hsla(hue, 60%, 50%, 0.15)   -- soft tinted background
text:   hsl(hue, 55%, 35%)          -- readable dark text
border: hsla(hue, 60%, 50%, 0.30)   -- subtle colored border
```

No changes needed to the Badge components in Revenue, Expenses, or Dashboard pages — they already use `variant="outline"` with `style={getSourceBadgeStyle(...)}`, so updating the color generator is sufficient.
