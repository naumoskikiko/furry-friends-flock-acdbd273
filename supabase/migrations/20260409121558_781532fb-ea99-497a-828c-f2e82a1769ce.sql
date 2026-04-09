-- Pet medications table
CREATE TABLE public.pet_medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL DEFAULT '',
  times TEXT[] NOT NULL DEFAULT '{}',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  repeat_type TEXT NOT NULL DEFAULT 'daily',
  repeat_days INTEGER[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pet_medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their pet medications"
  ON public.pet_medications FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can create pet medications"
  ON public.pet_medications FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their pet medications"
  ON public.pet_medications FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their pet medications"
  ON public.pet_medications FOR DELETE
  USING (auth.uid() = owner_id);

CREATE TRIGGER update_pet_medications_updated_at
  BEFORE UPDATE ON public.pet_medications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Medication logs table
CREATE TABLE public.medication_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id UUID NOT NULL REFERENCES public.pet_medications(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  taken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their medication logs"
  ON public.medication_logs FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can create medication logs"
  ON public.medication_logs FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their medication logs"
  ON public.medication_logs FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE INDEX idx_medication_logs_medication_id ON public.medication_logs(medication_id);
CREATE INDEX idx_medication_logs_scheduled_at ON public.medication_logs(scheduled_at);
CREATE INDEX idx_pet_medications_pet_id ON public.pet_medications(pet_id);
CREATE INDEX idx_pet_medications_owner_id ON public.pet_medications(owner_id);