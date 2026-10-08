-- Migration: Security Hardening, Search Path Locking, and RLS Audit Policies

-- 1. Ensure all SECURITY DEFINER functions have explicit search_path locked
ALTER FUNCTION public.is_admin(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_expired_sessions() SET search_path = public, pg_temp;
ALTER FUNCTION public.suspend_user_and_terminate_sessions(UUID, UUID, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.terminate_session_by_admin(UUID, UUID, TEXT) SET search_path = public, pg_temp;

-- 2. Grant explicit execute permissions on RPC functions to authenticated & anon roles where appropriate
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_sessions() TO service_role;
GRANT EXECUTE ON FUNCTION public.suspend_user_and_terminate_sessions(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.terminate_session_by_admin(UUID, UUID, TEXT) TO service_role;

-- 3. Verify Row Level Security is strictly enabled on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharing_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_access_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
