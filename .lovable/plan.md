

# Stakeholder Edit, Image Upload, and Better Card UI

## Overview

Three interconnected improvements: (1) implement edit functionality for stakeholders, (2) add profile image support when adding/editing stakeholders, and (3) redesign the stakeholder cards with better UI/UX.

---

## 1. Database: Add `image_url` column to `stakeholders` table

Add a nullable `image_url TEXT` column to the `stakeholders` table via migration.

## 2. Storage: Create `stakeholder-images` bucket

Create a public storage bucket `stakeholder-images` with RLS policies allowing cipher users to upload/delete images.

## 3. Update Type Definition

**File: `src/types/stakeholders.ts`**
- Add `image_url: string | null` to the `Stakeholder` interface.

## 4. Implement Edit Mode on StakeholderDetail Page

**File: `src/pages/StakeholderDetail.tsx`**

- Read `?edit=true` from the URL search params using `useSearchParams`.
- When `edit=true`, render an editable form (inline within the detail page) pre-filled with the stakeholder's current data: name, category, contact number, email, address, ID number, relationship notes, status, and the new image field.
- Include an `ImageUpload` component (already exists at `src/components/shared/ImageUpload.tsx`) for uploading/changing the stakeholder photo.
- On save, upload the image to the `stakeholder-images` bucket, then call `useSaveStakeholder` with the updated fields.
- Include Cancel and Save buttons; Cancel returns to view mode.

## 5. Add Image Upload to AddStakeholder Page

**File: `src/pages/AddStakeholder.tsx`**

- In Step 2 (Stakeholder Information), add the `ImageUpload` component at the top of the form.
- Store the selected file in state; on save, upload to `stakeholder-images/{companyId}/{stakeholderId}.ext` and include the public URL in the stakeholder insert.

## 6. Redesign Stakeholder Cards

**File: `src/pages/Stakeholders.tsx`**

Improve the `renderCard` function with:

- Display the stakeholder image (or a colored initial avatar as fallback) using the `Avatar` component.
- Add contact info (phone/email) as subtle icons below the name.
- Show a progress indicator for lenders (% repaid).
- Make action buttons (view/edit/delete) always visible on mobile, hover-reveal on desktop.
- Add a subtle gradient left-border color (emerald for investors, orange for lenders).
- Better spacing, slightly larger card with more breathing room.

## 7. Update Detail Page Header

**File: `src/pages/StakeholderDetail.tsx`**

- Replace the colored-circle initial with the actual stakeholder image (Avatar with fallback to initials).

---

## Technical Flow

```text
AddStakeholder                StakeholderDetail (edit mode)
     |                                |
     v                                v
ImageUpload component         ImageUpload component
     |                                |
     v                                v
Upload to storage bucket      Upload to storage bucket
     |                                |
     v                                v
Save stakeholder row          Update stakeholder row
(with image_url)              (with image_url)
```

## Files Modified

| File | Change |
|---|---|
| Migration SQL | Add `image_url` column + storage bucket + policies |
| `src/types/stakeholders.ts` | Add `image_url` field |
| `src/pages/StakeholderDetail.tsx` | Edit mode with form, image upload, avatar in header |
| `src/pages/AddStakeholder.tsx` | Add ImageUpload in step 2 |
| `src/pages/Stakeholders.tsx` | Redesigned cards with images, better layout, progress bars |

