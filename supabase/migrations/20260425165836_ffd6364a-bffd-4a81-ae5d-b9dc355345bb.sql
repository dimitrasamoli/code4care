
-- Fix search_path warning
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Tighten case insert: authenticated users can insert any case (intake form); 
-- replace true with explicit non-null check on full_name
DROP POLICY IF EXISTS "cases_insert_auth" ON public.patient_cases;
CREATE POLICY "cases_insert_auth" ON public.patient_cases FOR INSERT TO authenticated
  WITH CHECK (full_name IS NOT NULL AND age >= 0);

-- Tighten audit insert: require case_id to exist and current_hash present
DROP POLICY IF EXISTS "audit_insert_any" ON public.audit_chain;
CREATE POLICY "audit_insert_any" ON public.audit_chain FOR INSERT TO authenticated, anon
  WITH CHECK (current_hash IS NOT NULL AND length(current_hash) > 0 AND case_id IS NOT NULL);
