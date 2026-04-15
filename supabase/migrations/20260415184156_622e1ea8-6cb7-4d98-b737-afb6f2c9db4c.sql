
-- Create follow_requests table for private account approval
CREATE TABLE public.follow_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  target_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, target_id)
);

ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

-- Users can see requests they sent or received
CREATE POLICY "Users can view their follow requests"
  ON public.follow_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = target_id);

-- Users can send follow requests
CREATE POLICY "Users can create follow requests"
  ON public.follow_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Target user can accept/reject
CREATE POLICY "Target can update follow requests"
  ON public.follow_requests FOR UPDATE
  USING (auth.uid() = target_id);

-- Requester can cancel their request
CREATE POLICY "Requester can delete follow requests"
  ON public.follow_requests FOR DELETE
  USING (auth.uid() = requester_id);

-- Trigger for updated_at
CREATE TRIGGER update_follow_requests_updated_at
  BEFORE UPDATE ON public.follow_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
