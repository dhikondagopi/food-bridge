-- Drop and recreate the UPDATE policy with WITH CHECK clause
DROP POLICY IF EXISTS "Participants can update pickup requests" ON public.pickup_requests;

CREATE POLICY "Participants can update pickup requests"
ON public.pickup_requests
FOR UPDATE
TO authenticated
USING ((auth.uid() = ngo_id) OR (auth.uid() = volunteer_id))
WITH CHECK ((auth.uid() = ngo_id) OR (auth.uid() = volunteer_id));