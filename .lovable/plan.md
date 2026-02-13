
# Show Student Notes on Student Details Page

## What Changes

Add a "Notes" section to the student detail page that displays the student's notes when they exist. The notes will appear in the header area below the student info line (ID, enrollment date, email).

## Where It Will Show

The notes will be displayed right below the existing student subtitle line (the one showing ID, enrollment date, email) as a subtle text block with a sticky note icon. It will only render if the student has notes.

## File to Modify

| File | Change |
|------|--------|
| `src/pages/StudentDetail.tsx` | Add notes display below the student header subtitle |

## Technical Details

In `src/pages/StudentDetail.tsx`, after the existing `<p className="text-sm text-muted-foreground">` line (around line 127-131), add a conditional block:

```tsx
{student.notes && (
  <p className="text-sm text-muted-foreground mt-1 italic">
    <StickyNote className="inline h-3.5 w-3.5 mr-1" />
    {student.notes}
  </p>
)}
```

Import `StickyNote` from `lucide-react` alongside the existing icon imports.

This keeps it lightweight -- notes appear inline in the header rather than taking up a full card, since they're typically short (max 500 characters per the form validation).
