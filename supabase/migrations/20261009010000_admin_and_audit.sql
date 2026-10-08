-- Migration: Super Admin User Management, Security Audit Events, and Operational Settings

-- 1. Add status column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('active', 'suspended');
  END IF;
END $$;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'active' NOT NULL;

-- 2. Add reason column to admin_access_events if not already present
ALTER TABLE public.admin_access_events
ADD COLUMN IF NOT EXISTS reason TEXT;

-- 3. Create security_audit_events table
CREATE TABLE IF NOT EXISTS public.security_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_events_created ON public.security_audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_type ON public.security_audit_events(event_type);

-- 4. Create platform_settings table
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Populate default operational settings
INSERT INTO public.platform_settings (key, value, description)
VALUES
  ('max_invitation_expiry_hours', '24', 'Maximum allowed invitation expiration in hours'),
  ('invitation_creation_limit_per_hour', '10', 'Maximum invitations a user can create per hour'),
  ('gps_update_rate_limit_seconds', '2', 'Minimum seconds required between recipient location updates'),
  ('stale_location_threshold_seconds', '60', 'Seconds before a location fix is marked stale'),
  ('audit_retention_days', '90', 'Retention period for security audit logs in days')
ON CONFLICT (key) DO NOTHING;

-- 5. RLS Enablement
ALTER TABLE public.security_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Security Audit Events RLS Policies
CREATE POLICY "Admin can read security audit events" ON public.security_audit_events
FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admin can insert security audit events" ON public.security_audit_events
FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- Platform Settings RLS Policies
CREATE POLICY "Admin can read platform settings" ON public.platform_settings
FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admin can update platform settings" ON public.platform_settings
FOR UPDATE USING (is_admin(auth.uid()));

-- 6. RPC Function: Suspend user and terminate all active sessions & invitations
CREATE OR REPLACE FUNCTION suspend_user_and_terminate_sessions(
  p_target_user_id UUID,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_target_admin BOOLEAN;
BEGIN
  -- Verify caller is admin
  IF NOT is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Admin can suspend accounts.';
  END IF;

  -- Prevent suspending sole super admin
  SELECT is_admin(p_target_user_id) INTO v_is_target_admin;
  IF v_is_target_admin THEN
    RAISE EXCEPTION 'Cannot suspend the Super Admin account.';
  END IF;

  -- 1. Mark profile status as suspended
  UPDATE public.profiles
  SET status = 'suspended', updated_at = now()
  WHERE id = p_target_user_id;

  -- 2. Revoke pending sharing invitations
  UPDATE public.sharing_invitations
  SET status = 'revoked', updated_at = now()
  WHERE requester_id = p_target_user_id AND status = 'active';

  -- 3. Stop active sharing sessions
  UPDATE public.sharing_sessions
  SET status = 'stopped', stopped_at = now(), consent_revoked_at = now()
  WHERE requester_id = p_target_user_id AND status IN ('pending', 'active');

  -- 4. Delete current location coordinates for affected sessions
  DELETE FROM public.current_locations
  WHERE session_id IN (
    SELECT id FROM public.sharing_sessions WHERE requester_id = p_target_user_id
  );

  -- 5. Log security audit event
  INSERT INTO public.security_audit_events (actor_id, event_type, target_id, details)
  VALUES (
    p_admin_id,
    'user_suspended',
    p_target_user_id::text,
    jsonb_build_object('reason', COALESCE(p_reason, 'No reason specified'))
  );

  RETURN TRUE;
END;
$$;

-- 7. RPC Function: Admin terminate active sharing session
CREATE OR REPLACE FUNCTION terminate_session_by_admin(
  p_session_id UUID,
  p_admin_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Admin can terminate sessions.';
  END IF;

  -- 1. Stop session
  UPDATE public.sharing_sessions
  SET status = 'stopped', stopped_at = now(), consent_revoked_at = now()
  WHERE id = p_session_id;

  -- 2. Delete location coordinates
  DELETE FROM public.current_locations
  WHERE session_id = p_session_id;

  -- 3. Log audit events
  INSERT INTO public.admin_access_events (admin_id, session_id, access_type, reason)
  VALUES (p_admin_id, p_session_id, 'admin_session_terminated', p_reason);

  INSERT INTO public.security_audit_events (actor_id, event_type, target_id, details)
  VALUES (
    p_admin_id,
    'session_terminated_by_admin',
    p_session_id::text,
    jsonb_build_object('reason', p_reason)
  );

  RETURN TRUE;
END;
$$;
