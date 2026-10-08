-- Migration: Realtime configuration and admin access audit policies

-- Ensure admin can insert into admin_access_events
CREATE POLICY "Admin can insert admin access events" ON public.admin_access_events
FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- Enable Supabase Realtime publication for sharing_sessions and current_locations if publication exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sharing_sessions;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.current_locations;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
