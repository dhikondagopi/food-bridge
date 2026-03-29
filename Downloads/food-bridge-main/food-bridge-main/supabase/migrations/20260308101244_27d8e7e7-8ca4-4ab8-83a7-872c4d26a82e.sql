
CREATE TABLE public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  call_type TEXT NOT NULL DEFAULT 'voice',
  status TEXT NOT NULL DEFAULT 'missed',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_caller FOREIGN KEY (caller_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_receiver FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own call logs"
  ON public.call_logs FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Authenticated users can insert call logs"
  ON public.call_logs FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Participants can update call logs"
  ON public.call_logs FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);
