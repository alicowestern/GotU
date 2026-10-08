'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';
import { z } from 'zod';

const redeemSchema = z.object({
  rawToken: z.string().min(1),
  durationMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
  consentNoticeVersion: z.string().default('v1.0'),
});

export async function acceptAndRedeemInvitation(payload: {
  rawToken: string;
  durationMinutes: 15 | 30 | 60;
  consentNoticeVersion?: string;
}) {
  const parseResult = redeemSchema.safeParse(payload);
  if (!parseResult.success) {
    return { error: 'Invalid consent parameters. Duration must be 15, 30, or 60 minutes.' };
  }

  const { rawToken, durationMinutes, consentNoticeVersion } = parseResult.data;
  const minutesNum = Number(durationMinutes);

  // 1. Compute invitation token hash
  const invitationTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // 2. Generate a secure, session-scoped recipient bearer credential
  const rawRecipientToken = crypto.randomBytes(32).toString('hex');
  const recipientTokenHash = crypto.createHash('sha256').update(rawRecipientToken).digest('hex');

  const adminClient = createAdminClient();

  try {
    // 3. Call atomic RPC to redeem invitation and create sharing session
    const { data: sessionId, error } = await adminClient.rpc('redeem_invitation', {
      p_token_hash: invitationTokenHash,
      p_duration_minutes: minutesNum,
      p_consent_notice_version: consentNoticeVersion,
      p_recipient_token_hash: recipientTokenHash,
    });

    if (error || !sessionId) {
      console.error('Redeem RPC Error:', error);
      return { error: error?.message || 'Failed to activate location sharing session.' };
    }

    // Calculate session expiration timestamp
    const expiresAt = new Date(Date.now() + minutesNum * 60 * 1000).toISOString();

    return {
      success: true,
      sessionId,
      recipientToken: rawRecipientToken,
      expiresAt,
    };
  } catch (err: unknown) {
    console.error('Redeem Exception:', err);
    return { error: 'An error occurred while activating your session.' };
  }
}

export async function revokeRecipientSession(payload: {
  sessionId: string;
  recipientToken: string;
}) {
  if (!payload.sessionId || !payload.recipientToken) {
    return { error: 'Invalid parameters for revocation.' };
  }

  const recipientTokenHash = crypto.createHash('sha256').update(payload.recipientToken).digest('hex');
  const adminClient = createAdminClient();

  try {
    const { error } = await adminClient.rpc('revoke_session_by_recipient', {
      p_session_id: payload.sessionId,
      p_recipient_token_hash: recipientTokenHash,
    });

    if (error) {
      console.error('Revoke RPC Error:', error);
      return { error: 'Failed to revoke session on server.' };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('Revoke Exception:', err);
    return { error: 'Server error during revocation.' };
  }
}

export async function getRecipientSessionStatus(payload: {
  sessionId: string;
  recipientToken: string;
}) {
  if (!payload.sessionId || !payload.recipientToken) {
    return { error: 'Missing session identification.' };
  }

  const recipientTokenHash = crypto.createHash('sha256').update(payload.recipientToken).digest('hex');
  const adminClient = createAdminClient();

  const { data: session, error } = await adminClient
    .from('sharing_sessions')
    .select('id, status, expires_at, recipient_token_hash')
    .eq('id', payload.sessionId)
    .single();

  if (error || !session || session.recipient_token_hash !== recipientTokenHash) {
    return { error: 'Session not found or invalid recipient credentials.' };
  }

  // Check server-side expiration
  if (session.status === 'active' && session.expires_at && new Date(session.expires_at) <= new Date()) {
    // Auto-update to expired
    await adminClient.from('sharing_sessions').update({ status: 'expired' }).eq('id', payload.sessionId);
    await adminClient.from('current_locations').delete().eq('session_id', payload.sessionId);
    return { status: 'expired', expiresAt: session.expires_at, isExpired: true };
  }

  return {
    status: session.status,
    expiresAt: session.expires_at,
    isExpired: session.status === 'expired' || (session.expires_at ? new Date(session.expires_at) <= new Date() : false),
  };
}
