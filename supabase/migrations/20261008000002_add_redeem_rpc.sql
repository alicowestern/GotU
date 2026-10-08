CREATE OR REPLACE FUNCTION redeem_invitation(
  p_token_hash TEXT,
  p_duration_minutes INTEGER,
  p_consent_notice_version TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation public.sharing_invitations%ROWTYPE;
  v_session_id UUID;
BEGIN
  -- 1. Find and lock the invitation atomically to prevent race conditions
  SELECT * INTO v_invitation
  FROM public.sharing_invitations
  WHERE token_hash = p_token_hash
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or currently locked.';
  END IF;

  IF v_invitation.status != 'active' THEN
    RAISE EXCEPTION 'Invitation is not active.';
  END IF;

  IF v_invitation.expires_at < now() THEN
    UPDATE public.sharing_invitations SET status = 'expired' WHERE id = v_invitation.id;
    RAISE EXCEPTION 'Invitation has expired.';
  END IF;

  -- 2. Mark as redeemed
  UPDATE public.sharing_invitations
  SET status = 'redeemed',
      redeemed_at = now()
  WHERE id = v_invitation.id;

  -- 3. Create active sharing session
  INSERT INTO public.sharing_sessions (
    invitation_id,
    requester_id,
    status,
    sharing_duration_minutes,
    consent_granted_at,
    started_at,
    expires_at
  ) VALUES (
    v_invitation.id,
    v_invitation.requester_id,
    'active',
    p_duration_minutes,
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
