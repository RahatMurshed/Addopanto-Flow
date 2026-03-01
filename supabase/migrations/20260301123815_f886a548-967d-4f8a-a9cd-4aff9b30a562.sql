
-- Remove mod_courses_* and deo_courses columns from company_memberships
-- These permissions had no RLS backing (courses are Admin/Cipher only)
ALTER TABLE public.company_memberships DROP COLUMN IF EXISTS mod_courses_add;
ALTER TABLE public.company_memberships DROP COLUMN IF EXISTS mod_courses_edit;
ALTER TABLE public.company_memberships DROP COLUMN IF EXISTS mod_courses_delete;
ALTER TABLE public.company_memberships DROP COLUMN IF EXISTS deo_courses;
