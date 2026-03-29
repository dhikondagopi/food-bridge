
-- Drop the existing update policy
DROP POLICY IF EXISTS "Participants can update pickup requests" ON public.pickup_requests;

-- Recreate with a policy that allows any authenticated user to accept (when volunteer_id is null)
-- and allows participants (ngo or volunteer) to update their own requests
CREATE POLICY "Participants can update pickup requests"
ON public.pickup_requests
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = ngo_id) 
  OR (auth.uid() = volunteer_id) 
  OR (volunteer_id IS NULL)
)
WITH CHECK (
  (auth.uid() = ngo_id) 
  OR (auth.uid() = volunteer_id)
);
