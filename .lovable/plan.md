

## Recommended Fixes — Implementation Plan

### Fix 1: Storage Bucket Hardening

All three buckets (`company-logos`, `user-avatars`, `profile-avatars`) currently have **no file size limit** and **no MIME type restriction**. This means users could upload arbitrarily large files or non-image files.

**Change:** Update each bucket to enforce:
- **5 MB** max file size
- **Allowed MIME types:** `image/png`, `image/jpeg`, `image/webp`

This is a safe, non-breaking change. The frontend `ImageUpload` component already enforces a 2 MB limit and the same MIME types client-side — this adds the server-side safety net.

---

### Fix 2: Remove Duplicate RLS Policies on `courses`

The `courses` table currently has **7 policies**, but 3 are redundant duplicates:

| Keep (descriptive names) | Remove (duplicates) |
|---|---|
| Users with batch add permission can create courses (INSERT) | `courses_insert` (INSERT) |
| Users with batch edit permission can update courses (UPDATE) | `courses_update` (UPDATE) |
| Users with batch delete permission can delete courses (DELETE) | `courses_delete` (DELETE) |

The duplicates use the same permission functions with swapped argument order (`auth.uid(), company_id` vs `company_id, auth.uid()`), but both resolve identically. Removing the duplicates eliminates unnecessary policy evaluation overhead.

**Migration SQL:**
```sql
DROP POLICY IF EXISTS "courses_insert" ON public.courses;
DROP POLICY IF EXISTS "courses_update" ON public.courses;
DROP POLICY IF EXISTS "courses_delete" ON public.courses;
```

---

### Fix 3: Enable Leaked Password Protection

Enable the **HaveIBeenPwned** password check via the auth configuration tool. This rejects passwords known to be compromised — zero risk to existing users (only applies at signup/password change time).

---

### Technical Details

- **Fix 1** — One SQL migration updating `storage.buckets` rows (data update, not schema change).
- **Fix 2** — One SQL migration dropping 3 redundant policies.
- **Fix 3** — Auth config tool call.
- No application code changes required for any of these fixes.

