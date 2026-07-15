-- Safety field inspections with AI defect detection
CREATE TABLE IF NOT EXISTS public.safety_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.safety_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to safety_inspections"
  ON public.safety_inspections
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_safety_inspections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS safety_inspections_updated_at ON public.safety_inspections;
CREATE TRIGGER safety_inspections_updated_at
  BEFORE UPDATE ON public.safety_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_safety_inspections_updated_at();
