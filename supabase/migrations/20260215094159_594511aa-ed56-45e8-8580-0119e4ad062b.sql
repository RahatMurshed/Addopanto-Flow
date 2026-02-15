ALTER TABLE public.company_memberships
  ADD COLUMN can_view_revenue boolean NOT NULL DEFAULT false,
  ADD COLUMN can_view_expense boolean NOT NULL DEFAULT false;