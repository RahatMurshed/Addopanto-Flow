
-- Create sales_note_categories table
CREATE TABLE public.sales_note_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  label text NOT NULL,
  value text NOT NULL,
  color_class text NOT NULL DEFAULT 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, value)
);

-- Enable RLS
ALTER TABLE public.sales_note_categories ENABLE ROW LEVEL SECURITY;

-- Company members can view categories
CREATE POLICY "Company members can view custom categories"
ON public.sales_note_categories FOR SELECT
USING (
  (company_id = get_active_company_id(auth.uid()))
  AND is_company_member(auth.uid(), company_id)
);

-- Admin/Cipher can insert categories
CREATE POLICY "Admin/Cipher can insert custom categories"
ON public.sales_note_categories FOR INSERT
WITH CHECK (
  (company_id = get_active_company_id(auth.uid()))
  AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()))
  AND (created_by = auth.uid())
);

-- Admin/Cipher can delete categories
CREATE POLICY "Admin/Cipher can delete custom categories"
ON public.sales_note_categories FOR DELETE
USING (
  (company_id = get_active_company_id(auth.uid()))
  AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()))
);
