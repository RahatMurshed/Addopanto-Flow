

# Add Profile Photo Avatar to Stakeholder Cards

## What changes

Add a stakeholder profile photo (or initials fallback) to each card in the stakeholder list, using the existing `UserAvatar` component pattern and the `image_url` field already stored in the database.

## Technical details

**File: `src/pages/Stakeholders.tsx`**

- Import `Avatar`, `AvatarImage`, `AvatarFallback` from `@/components/ui/avatar`
- In the `renderCard` function, add an avatar circle to the left of the stakeholder name
  - If `s.image_url` exists, show the image
  - Otherwise, show colored initials (emerald background for investors, orange for lenders)
- The card layout changes from the current name-on-left / buttons-on-right to: avatar + name on the left, buttons on the right

The change is minimal -- just adding the avatar element inside the existing card structure without altering the overall card design.

