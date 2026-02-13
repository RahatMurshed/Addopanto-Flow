

# Fix Payment Notes Timeline Card Layout Overflow

## Problem

The Payment Notes card breaks the page layout because long text without spaces (e.g., "rgheeeeeeeeeeeeeerheerererererer...") overflows horizontally, stretching the card beyond the page width.

## Fix

Add `overflow-wrap: anywhere` (via Tailwind's `break-all` or `break-words` class) to the note text paragraph so long unbroken strings wrap properly within the card boundaries.

## File to Modify

| File | Change |
|------|--------|
| `src/pages/StudentDetail.tsx` | Add `break-all` class to the note text `<p>` element in the Payment Notes timeline |

## Technical Details

On line 379, update the note text paragraph from:

```tsx
<p className="text-sm whitespace-pre-wrap">{p.description}</p>
```

to:

```tsx
<p className="text-sm whitespace-pre-wrap break-all">{p.description}</p>
```

This ensures any long continuous string (no spaces) will break at the card boundary instead of overflowing and stretching the entire page layout.

