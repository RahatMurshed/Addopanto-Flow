

## Fix Source Color Collisions - Unique Color Per Source

### Problem
The current system has only 10 predefined colors and uses `hash % 10` to pick one. With sources like "Admission fee" and "Seminar" producing the same index, they get identical colors.

### Solution
Replace the fixed 10-color palette with **dynamic HSL color generation** from the hash value. Instead of picking from a small list, generate a unique hue (0-360 degrees) for each source name. This gives effectively unlimited distinct colors.

### How it works

The hash of the source name is used to derive:
- **Hue**: `hash % 360` (full color wheel, so "Admission fee" and "Seminar" will land on different hues)
- **Saturation/Lightness**: Fixed values tuned for light and dark mode readability

This keeps the system fully deterministic (same name = same color everywhere) while virtually eliminating collisions.

### Technical details

**File: `src/utils/sourceColors.ts`** (modify)

Replace `getSourceColor` logic:
- Remove `SOURCE_COLOR_PALETTE` and `DARK_SOURCE_COLOR_PALETTE` arrays
- Keep `hashString` function and `UNCATEGORIZED_STYLE`
- Generate colors dynamically:

```typescript
export function getSourceColor(name, isDark) {
  if (!name || name === "Uncategorized") return uncategorized;
  const hue = hashString(name) % 360;
  if (isDark) {
    return {
      bg: `hsl(${hue}, 45%, 20%)`,
      text: `hsl(${hue}, 70%, 70%)`,
      border: `hsl(${hue}, 45%, 35%)`
    };
  }
  return {
    bg: `hsl(${hue}, 70%, 92%)`,
    text: `hsl(${hue}, 70%, 35%)`,
    border: `hsl(${hue}, 60%, 65%)`
  };
}
```

No changes needed in Dashboard, Revenue, or Expenses pages -- they already call `getSourceBadgeStyle(name)` which will automatically use the new color generation.

### Files to modify

| File | Change |
|---|---|
| `src/utils/sourceColors.ts` | Replace fixed palette with dynamic HSL generation from hash |

