
-- Enum for app roles
CREATE TYPE public.app_role AS ENUM ('patient', 'reception', 'doctor', 'admin');
CREATE TYPE public.case_status AS ENUM ('waiting', 'in_progress', 'treated');
CREATE TYPE public.risk_level AS ENUM ('low', 'medium', 'high');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id ORDER BY 
    CASE role WHEN 'admin' THEN 1 WHEN 'doctor' THEN 2 WHEN 'reception' THEN 3 ELSE 4 END
  LIMIT 1
$$;

-- Patient cases
CREATE TABLE public.patient_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  age INT NOT NULL,
  symptoms TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  chronic_condition BOOLEAN NOT NULL DEFAULT false,
  risk_score INT NOT NULL DEFAULT 0,
  risk_level risk_level NOT NULL DEFAULT 'low',
  status case_status NOT NULL DEFAULT 'waiting',
  estimated_wait_minutes INT NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.patient_cases ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_cases_status_risk ON public.patient_cases(status, risk_score DESC);

-- Audit chain (blockchain-inspired)
CREATE TABLE public.audit_chain (
  id BIGSERIAL PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.patient_cases(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  risk_score INT,
  actor_id UUID REFERENCES auth.users(id),
  actor_role TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  previous_hash TEXT,
  current_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_chain ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_case ON public.audit_chain(case_id);
CREATE INDEX idx_audit_created ON public.audit_chain(created_at DESC);

-- Trigger: auto-create profile + default patient role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  selected_role app_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  selected_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'patient');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, selected_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_cases_updated BEFORE UPDATE ON public.patient_cases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS POLICIES

-- profiles: users see/update own; staff see all
CREATE POLICY "own_profile_select" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'reception'));
CREATE POLICY "own_profile_update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "own_profile_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- user_roles: users see own role; admins see all
CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- patient_cases:
-- patients see only their own; staff see all
CREATE POLICY "cases_select" ON public.patient_cases FOR SELECT TO authenticated
  USING (
    patient_user_id = auth.uid()
    OR has_role(auth.uid(), 'doctor')
    OR has_role(auth.uid(), 'reception')
    OR has_role(auth.uid(), 'admin')
  );
-- anyone authenticated can submit a case (intake form). also allow anonymous via separate policy below
CREATE POLICY "cases_insert_auth" ON public.patient_cases FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "cases_insert_anon" ON public.patient_cases FOR INSERT TO anon
  WITH CHECK (patient_user_id IS NULL);
-- staff updates
CREATE POLICY "cases_update_staff" ON public.patient_cases FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'reception') OR has_role(auth.uid(), 'admin'));

-- audit_chain: staff read; insert by anyone authenticated (system writes); no updates/deletes
CREATE POLICY "audit_select_staff" ON public.audit_chain FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'reception')
    OR EXISTS (SELECT 1 FROM public.patient_cases c WHERE c.id = audit_chain.case_id AND c.patient_user_id = auth.uid())
  );
CREATE POLICY "audit_insert_any" ON public.audit_chain FOR INSERT TO authenticated, anon
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_cases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_chain;
