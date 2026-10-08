-- Create application config for secure Server-Side admin lookup
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
-- No RLS policies so it is strictly accessible only to service_role / PostgreSQL

CREATE OR REPLACE FUNCTION is_admin(uid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.app_config 
    WHERE key = 'SUPER_ADMIN_ID' AND value = uid::text
  );
END;
$$ LANGUAGE plpgsql;

-- Tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TYPE invitation_status AS ENUM ('active', 'redeemed', 'revoked', 'expired');

CREATE TABLE IF NOT EXISTS public.sharing_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  purpose TEXT NOT NULL,
  recipient_label TEXT,
  status invitation_status DEFAULT 'active' NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_invitations_requester ON public.sharing_invitations(requester_id);

CREATE TYPE session_status AS ENUM ('pending', 'active', 'stopped', 'expired');

CREATE TABLE IF NOT EXISTS public.sharing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES public.sharing_invitations(id) ON DELETE RESTRICT,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status session_status DEFAULT 'pending' NOT NULL,
  sharing_duration_minutes INTEGER,
  consent_granted_at TIMESTAMPTZ,
  consent_revoked_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sessions_requester ON public.sharing_sessions(requester_id);
CREATE INDEX idx_sessions_status_expires ON public.sharing_sessions(status, expires_at);

CREATE TABLE IF NOT EXISTS public.current_locations (
  session_id UUID PRIMARY KEY REFERENCES public.sharing_sessions(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy_meters DOUBLE PRECISION NOT NULL CHECK (accuracy_meters >= 0),
  recorded_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TYPE consent_event_type AS ENUM ('granted', 'revoked');

CREATE TABLE IF NOT EXISTS public.consent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sharing_sessions(id) ON DELETE CASCADE,
  event_type consent_event_type NOT NULL,
  event_time TIMESTAMPTZ DEFAULT now() NOT NULL,
  sharing_duration_minutes INTEGER,
  consent_notice_version TEXT
);
CREATE INDEX idx_consent_session ON public.consent_events(session_id);

CREATE TABLE IF NOT EXISTS public.admin_access_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sharing_sessions(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL,
  accessed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER sharing_invitations_updated_at BEFORE UPDATE ON public.sharing_invitations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER current_locations_updated_at BEFORE UPDATE ON public.current_locations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS Enablement
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharing_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_access_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can read all profiles" ON public.profiles FOR SELECT USING (is_admin(auth.uid()));

-- Sharing Invitations (Read-only for users, writes are server-only)
CREATE POLICY "Requesters can read own invitations" ON public.sharing_invitations FOR SELECT USING (auth.uid() = requester_id);

-- Sharing Sessions
CREATE POLICY "Users can read own sessions" ON public.sharing_sessions FOR SELECT USING (auth.uid() = requester_id);
CREATE POLICY "Admin can read all sessions" ON public.sharing_sessions FOR SELECT USING (is_admin(auth.uid()));

-- Current Locations
-- Read allowed if requester owns an active, unexpired, consented session.
CREATE POLICY "Requesters can read own active session locations" ON public.current_locations FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.sharing_sessions s
    WHERE s.id = session_id 
    AND s.requester_id = auth.uid()
    AND s.status = 'active'
    AND s.expires_at > now()
  )
);
CREATE POLICY "Admin can read locations" ON public.current_locations FOR SELECT USING (is_admin(auth.uid()));

-- Consent Events
CREATE POLICY "Requesters can read own consent events" ON public.consent_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sharing_sessions s WHERE s.id = session_id AND s.requester_id = auth.uid())
);
CREATE POLICY "Admin can read consent events" ON public.consent_events FOR SELECT USING (is_admin(auth.uid()));

-- Admin Access Events
CREATE POLICY "Admin can read admin access events" ON public.admin_access_events FOR SELECT USING (is_admin(auth.uid()));

-- Expiry Cleanup Function
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.sharing_sessions
  SET status = 'expired'
  WHERE status = 'active' AND expires_at <= now();

  DELETE FROM public.current_locations
  WHERE session_id IN (
    SELECT id FROM public.sharing_sessions WHERE status != 'active'
  );
END;
$$;
