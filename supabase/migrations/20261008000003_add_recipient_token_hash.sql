-- Migration: Add recipient_token_hash to sharing_sessions and updated RPCs for Task 5

ALTER TABLE public.sharing_sessions
ADD COLUMN IF NOT EXISTS recipient_token_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_sessions_recipient_token ON public.sharing_sessions(recipient_token_hash);

-- Updated redeem_invitation RPC accepting p_recipient_token_hash
CREATE OR REPLACE FUNCTION redeem_invitation(
  p_token_hash TEXT,
  p_duration_minutes INTEGER,
  p_consent_notice_version TEXT,
  p_recipient_token_hash TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation public.sharing_invitations%ROWTYPE;
  v_session_id UUID;
BEGIN
  -- 1. Find and lock the invitation atomically to prevent concurrent redemption
  SELECT * INTO v_invitation
  FROM public.sharing_invitations
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found.';
  END IF;

  IF v_invitation.status != 'active' THEN
    RAISE EXCEPTION 'Invitation is not active.';
  END IF;

  IF v_invitation.expires_at < now() THEN
    UPDATE public.sharing_invitations SET status = 'expired' WHERE id = v_invitation.id;
    RAISE EXCEPTION 'Invitation has expired.';
  END IF;

  -- 2. Mark invitation as redeemed
  UPDATE public.sharing_invitations
  SET status = 'redeemed',
      redeemed_at = now()
  WHERE id = v_invitation.id;

  -- 3. Create active sharing session with recipient token hash
  INSERT INTO public.sharing_sessions (
    invitation_id,
    requester_id,
    status,
    sharing_duration_minutes,
    recipient_token_hash,
    consent_granted_at,
    started_at,
    expires_at
  ) VALUES (
    v_invitation.id,
    v_invitation.requester_id,
    'active',
    p_duration_minutes,
    p_recipient_token_hash,
    now(),
    now(),
    now() + (p_duration_minutes || ' minutes')::interval
  ) RETURNING id INTO v_session_id;

  -- 4. Record consent event
  INSERT INTO public.consent_events (
    session_id,
    event_type,
    event_time,
    sharing_duration_minutes,
    consent_notice_version
  ) VALUES (
    v_session_id,
    'granted',
    now(),
    p_duration_minutes,
    p_consent_notice_version
  );

  RETURN v_session_id;
END;
$$;

-- Idempotent session revocation RPC for recipient
CREATE OR REPLACE FUNCTION revoke_session_by_recipient(
  p_session_id UUID,
  p_recipient_token_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session public.sharing_sessions%ROWTYPE;
BEGIN
  -- Verify session exists and token hash matches
  SELECT * INTO v_session
  FROM public.sharing_sessions
  WHERE id = p_session_id AND recipient_token_hash = p_recipient_token_hash;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- If already stopped or expired, return true (idempotent)
  IF v_session.status IN ('stopped', 'expired') THEN
    DELETE FROM public.current_locations WHERE session_id = p_session_id;
    RETURN TRUE;
  END IF;

  -- Revoke session
  UPDATE public.sharing_sessions
  SET status = 'stopped',
      stopped_at = now(),
      consent_revoked_at = now()
  WHERE id = p_session_id;

  -- Record revocation consent event
  INSERT INTO public.consent_events (
    session_id,
    event_type,
    event_time,
    sharing_duration_minutes,
    consent_notice_version
  ) VALUES (
    p_session_id,
    'revoked',
    now(),
    v_session.sharing_duration_minutes,
    'v1.0'
  );

  -- Delete current location row
  DELETE FROM public.current_locations WHERE session_id = p_session_id;

  RETURN TRUE;
END;
$$;
