
CREATE TABLE public.saved_search_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  filters jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_search_presets_user_company ON public.saved_search_presets (user_id, company_id);

ALTER TABLE public.saved_search_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own presets"
ON public.saved_search_presets FOR SELECT
USING (auth.uid() = user_id AND company_id = get_active_company_id(auth.uid()));

CREATE POLICY "Users can insert own presets"
ON public.saved_search_presets FOR INSERT
WITH CHECK (auth.uid() = user_id AND company_id = get_active_company_id(auth.uid()));

CREATE POLICY "Users can delete own presets"
ON public.saved_search_presets FOR DELETE
USING (auth.uid() = user_id AND company_id = get_active_company_id(auth.uid()));
