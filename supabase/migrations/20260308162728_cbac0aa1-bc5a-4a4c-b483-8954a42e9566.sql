
CREATE TABLE public.volunteer_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_request_id uuid NOT NULL REFERENCES public.pickup_requests(id) ON DELETE CASCADE,
  volunteer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ngo_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL,
  feedback text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (pickup_request_id, ngo_id)
);

ALTER TABLE public.volunteer_ratings ENABLE ROW LEVEL SECURITY;

-- NGOs can insert their own ratings
CREATE POLICY "NGOs can insert ratings"
ON public.volunteer_ratings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = ngo_id);

-- Anyone authenticated can view ratings
CREATE POLICY "Authenticated users can view ratings"
ON public.volunteer_ratings
FOR SELECT
TO authenticated
USING (true);

-- NGOs can update their own ratings
CREATE POLICY "NGOs can update their ratings"
ON public.volunteer_ratings
FOR UPDATE
TO authenticated
USING (auth.uid() = ngo_id);

-- Create a validation trigger to ensure rating is 1-5
CREATE OR REPLACE FUNCTION public.validate_rating()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_rating_value
  BEFORE INSERT OR UPDATE ON public.volunteer_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_rating();
