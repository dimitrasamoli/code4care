-- 20260508_add_missing_columns.sql

ALTER TABLE public.patient_cases
ADD COLUMN IF NOT EXISTS assigned_hospital TEXT;

ALTER TABLE public.patient_cases
ADD COLUMN IF NOT EXISTS ambulance_arrival BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.patient_cases
ADD COLUMN IF NOT EXISTS ambulance_plate TEXT;

ALTER TABLE public.patient_cases
ADD COLUMN IF NOT EXISTS assigned_hospital TEXT;

ALTER TABLE public.patient_cases
ADD COLUMN IF NOT EXISTS ambulance_arrival BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.patient_cases
ADD COLUMN IF NOT EXISTS ambulance_plate TEXT;

ALTER TABLE public.patient_cases
ADD COLUMN IF NOT EXISTS patient_code TEXT;

UPDATE public.patient_cases
SET patient_code = 'P-' || upper(substr(md5(id::text), 1, 6))
WHERE patient_code IS NULL;

ALTER TABLE public.patient_cases
ALTER COLUMN patient_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_cases_patient_code
ON public.patient_cases(patient_code);