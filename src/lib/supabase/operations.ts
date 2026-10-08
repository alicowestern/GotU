import 'server-only';
import { createAdminClient } from './admin';

// These functions represent the server-only data access layer.
// They use the service role key to bypass RLS, ensuring that guests
// or specific workflows can write data securely without granting
// broad RLS permissions. 
// REAL IMPLEMENTATION OF AUTHORIZATION CHECKS MUST HAPPEN IN THE CALLING ROUTE/ACTION.

export async function createInvitation(requesterId: string, tokenHash: string, purpose: string, recipientLabel: string, expiresAt: Date) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('sharing_invitations')
    .insert({
      requester_id: requesterId,
      token_hash: tokenHash,
      purpose,
      recipient_label: recipientLabel,
      expires_at: expiresAt.toISOString(),
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function redeemInvitation(invitationId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('sharing_invitations')
    .update({ 
      status: 'redeemed',
      redeemed_at: new Date().toISOString(),
    })
    .eq('id', invitationId)
    .eq('status', 'active')
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createSession(invitationId: string, requesterId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('sharing_sessions')
    .insert({
      invitation_id: invitationId,
      requester_id: requesterId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function grantConsent(sessionId: string, durationMinutes: number, noticeVersion: string) {
  const supabase = createAdminClient();
  
  // Update session
  const { error: sessionError } = await supabase
    .from('sharing_sessions')
    .update({
      status: 'active',
      sharing_duration_minutes: durationMinutes,
      consent_granted_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + durationMinutes * 60000).toISOString(),
    })
    .eq('id', sessionId);

  if (sessionError) throw sessionError;

  // Log consent event
  const { error: eventError } = await supabase
    .from('consent_events')
    .insert({
      session_id: sessionId,
      event_type: 'granted',
      sharing_duration_minutes: durationMinutes,
      consent_notice_version: noticeVersion,
    });

  if (eventError) throw eventError;
}

export async function updateLocation(sessionId: string, latitude: number, longitude: number, accuracyMeters: number) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('current_locations')
    .upsert({
      session_id: sessionId,
      latitude,
      longitude,
      accuracy_meters: accuracyMeters,
      recorded_at: new Date().toISOString(),
    });

  if (error) throw error;
}

export async function revokeConsent(sessionId: string) {
  const supabase = createAdminClient();
  
  // Update session
  const { error: sessionError } = await supabase
    .from('sharing_sessions')
    .update({
      status: 'stopped',
      consent_revoked_at: new Date().toISOString(),
      stopped_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (sessionError) throw sessionError;

  // Delete locations
  await supabase
    .from('current_locations')
    .delete()
    .eq('session_id', sessionId);

  // Log event
  const { error: eventError } = await supabase
    .from('consent_events')
    .insert({
      session_id: sessionId,
      event_type: 'revoked',
    });

  if (eventError) throw eventError;
}

export async function recordAdminAccess(adminId: string, sessionId: string, accessType: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('admin_access_events')
    .insert({
      admin_id: adminId,
      session_id: sessionId,
      access_type: accessType,
    });

  if (error) throw error;
}

export async function cleanupExpiredSessions() {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc('cleanup_expired_sessions');
  if (error) throw error;
}
