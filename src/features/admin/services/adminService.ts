import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type AdminUserSummary = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  status: 'active' | 'suspended';
  created_at: string;
  updated_at: string;
  isAdmin: boolean;
  activeSessionCount?: number;
};

export type AdminSessionSummary = {
  id: string;
  invitation_id: string;
  requester_id: string;
  requester_name: string | null;
  recipient_label: string | null;
  purpose: string | null;
  status: 'pending' | 'active' | 'stopped' | 'expired';
  sharing_duration_minutes: number | null;
  consent_granted_at: string | null;
  started_at: string | null;
  expires_at: string | null;
  stopped_at: string | null;
  created_at: string;
  hasLocation: boolean;
};

export type SecurityAuditEventItem = {
  id: string;
  actor_id: string | null;
  actor_name?: string | null;
  event_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type AdminAccessEventItem = {
  id: string;
  admin_id: string;
  session_id: string;
  access_type: string;
  reason: string | null;
  accessed_at: string;
};

export type PlatformSettingItem = {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
};

/**
 * Enforces Super Admin authorization on the server.
 * Fails closed if user is unauthenticated, not an admin, or admin config is missing.
 */
export async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const adminClient = createAdminClient();
  const { data: isAdminData, error: rpcErr } = await adminClient.rpc('is_admin', { uid: user.id });

  if (rpcErr || !isAdminData) {
    throw new Error('Forbidden: Super Admin privileges required.');
  }

  return user;
}

/**
 * Checks whether a given user ID is the Super Admin.
 */
export async function checkIsSuperAdmin(userId: string): Promise<boolean> {
  const adminClient = createAdminClient();
  const { data: isAdminData } = await adminClient.rpc('is_admin', { uid: userId });
  return Boolean(isAdminData);
}

/**
 * Real database-backed KPI metrics for /admin/dashboard.
 */
export async function getAdminDashboardMetrics() {
  await requireSuperAdmin();
  const adminClient = createAdminClient();

  const [
    { count: totalUsers },
    { count: activeUsers },
    { count: pendingInvitations },
    { count: activeSessions },
    { count: expiredSessions },
    { count: stoppedSessions },
    { data: recentEvents },
  ] = await Promise.all([
    adminClient.from('profiles').select('*', { count: 'exact', head: true }),
    adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    adminClient.from('sharing_invitations').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    adminClient.from('sharing_sessions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    adminClient.from('sharing_sessions').select('*', { count: 'exact', head: true }).eq('status', 'expired'),
    adminClient.from('sharing_sessions').select('*', { count: 'exact', head: true }).eq('status', 'stopped'),
    adminClient
      .from('security_audit_events')
      .select('id, actor_id, event_type, target_id, details, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  return {
    totalUsers: totalUsers || 0,
    activeUsers: activeUsers || 0,
    pendingInvitations: pendingInvitations || 0,
    activeSessions: activeSessions || 0,
    expiredSessions: expiredSessions || 0,
    stoppedSessions: stoppedSessions || 0,
    recentEvents: (recentEvents as SecurityAuditEventItem[]) || [],
  };
}

/**
 * List all users with status and active session counts.
 */
export async function getAdminUsers(): Promise<AdminUserSummary[]> {
  await requireSuperAdmin();
  const adminClient = createAdminClient();

  const { data: profiles, error } = await adminClient
    .from('profiles')
    .select('id, full_name, avatar_url, status, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error || !profiles) {
    return [];
  }

  // Determine admin status per user
  const result: AdminUserSummary[] = [];
  for (const p of profiles) {
    const isAdmin = await checkIsSuperAdmin(p.id);
    const { count: activeCount } = await adminClient
      .from('sharing_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('requester_id', p.id)
      .eq('status', 'active');

    result.push({
      id: p.id,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      status: (p.status as 'active' | 'suspended') || 'active',
      created_at: p.created_at,
      updated_at: p.updated_at,
      isAdmin,
      activeSessionCount: activeCount || 0,
    });
  }

  return result;
}

/**
 * Suspend a user account and terminate their active sessions & invitations.
 * Prevents suspending the sole Super Admin.
 */
export async function suspendUser(targetUserId: string, reason: string) {
  const adminUser = await requireSuperAdmin();

  // Prevent self-suspension or suspending sole admin
  const isTargetAdmin = await checkIsSuperAdmin(targetUserId);
  if (isTargetAdmin) {
    throw new Error('Cannot suspend the Super Admin account.');
  }

  const adminClient = createAdminClient();

  // Execute RPC for atomic suspension & session revocation
  const { error } = await adminClient.rpc('suspend_user_and_terminate_sessions', {
    p_target_user_id: targetUserId,
    p_admin_id: adminUser.id,
    p_reason: reason || 'Suspended by Super Admin',
  });

  if (error) {
    // Fallback manual execution if RPC not deployed yet
    await adminClient.from('profiles').update({ status: 'suspended' }).eq('id', targetUserId);
    await adminClient.from('sharing_invitations').update({ status: 'revoked' }).eq('requester_id', targetUserId).eq('status', 'active');
    await adminClient.from('sharing_sessions').update({ status: 'stopped' }).eq('requester_id', targetUserId).in('status', ['pending', 'active']);
    
    // Delete location coordinates for target user's sessions
    const { data: userSessions } = await adminClient.from('sharing_sessions').select('id').eq('requester_id', targetUserId);
    if (userSessions && userSessions.length > 0) {
      const sessionIds = userSessions.map((s) => s.id);
      await adminClient.from('current_locations').delete().in('session_id', sessionIds);
    }

    // Log audit event
    await adminClient.from('security_audit_events').insert({
      actor_id: adminUser.id,
      event_type: 'user_suspended',
      target_id: targetUserId,
      details: { reason: reason || 'Suspended by Super Admin' },
    });
  }

  return { success: true };
}

/**
 * Reactivate a suspended user account.
 */
export async function reactivateUser(targetUserId: string) {
  const adminUser = await requireSuperAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('profiles')
    .update({ status: 'active' })
    .eq('id', targetUserId);

  if (error) {
    throw new Error('Failed to reactivate user.');
  }

  // Log audit event
  await adminClient.from('security_audit_events').insert({
    actor_id: adminUser.id,
    event_type: 'user_reactivated',
    target_id: targetUserId,
    details: { reason: 'Reactivated by Super Admin' },
  });

  return { success: true };
}

/**
 * List all sessions with requester details for /admin/sessions.
 */
export async function getAdminSessions(): Promise<AdminSessionSummary[]> {
  await requireSuperAdmin();
  const adminClient = createAdminClient();

  const { data: sessions, error } = await adminClient
    .from('sharing_sessions')
    .select(
      `
      id,
      invitation_id,
      requester_id,
      status,
      sharing_duration_minutes,
      consent_granted_at,
      started_at,
      expires_at,
      stopped_at,
      created_at,
      profiles ( full_name ),
      sharing_invitations ( recipient_label, purpose )
    `
    )
    .order('created_at', { ascending: false });

  if (error || !sessions) {
    return [];
  }

  type DbSessionRawRow = {
    id: string;
    invitation_id: string;
    requester_id: string;
    status: 'pending' | 'active' | 'stopped' | 'expired';
    sharing_duration_minutes: number | null;
    consent_granted_at: string | null;
    started_at: string | null;
    expires_at: string | null;
    stopped_at: string | null;
    created_at: string;
    profiles: { full_name: string | null } | { full_name: string | null }[] | null;
    sharing_invitations: { recipient_label: string | null; purpose: string | null } | { recipient_label: string | null; purpose: string | null }[] | null;
  };

  const result: AdminSessionSummary[] = [];

  for (const raw of sessions as unknown as DbSessionRawRow[]) {
    const inv = Array.isArray(raw.sharing_invitations) ? raw.sharing_invitations[0] : raw.sharing_invitations;
    const prof = Array.isArray(raw.profiles) ? raw.profiles[0] : raw.profiles;

    // Check if location exists
    const { data: loc } = await adminClient
      .from('current_locations')
      .select('session_id')
      .eq('session_id', raw.id)
      .maybeSingle();

    result.push({
      id: raw.id,
      invitation_id: raw.invitation_id,
      requester_id: raw.requester_id,
      requester_name: prof?.full_name || 'Anonymous User',
      recipient_label: inv?.recipient_label || null,
      purpose: inv?.purpose || null,
      status: raw.status,
      sharing_duration_minutes: raw.sharing_duration_minutes,
      consent_granted_at: raw.consent_granted_at,
      started_at: raw.started_at,
      expires_at: raw.expires_at,
      stopped_at: raw.stopped_at,
      created_at: raw.created_at,
      hasLocation: Boolean(loc),
    });
  }

  return result;
}

/**
 * Administrative termination of an active sharing session with compulsory reason.
 */
export async function terminateSessionByAdmin(sessionId: string, reason: string) {
  const adminUser = await requireSuperAdmin();

  if (!reason || reason.trim().length === 0) {
    throw new Error('An explicit reason is required to terminate a session.');
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient.rpc('terminate_session_by_admin', {
    p_session_id: sessionId,
    p_admin_id: adminUser.id,
    p_reason: reason,
  });

  if (error) {
    // Manual fallback
    await adminClient.from('sharing_sessions').update({ status: 'stopped', stopped_at: new Date().toISOString() }).eq('id', sessionId);
    await adminClient.from('current_locations').delete().eq('session_id', sessionId);

    await adminClient.from('admin_access_events').insert({
      admin_id: adminUser.id,
      session_id: sessionId,
      access_type: 'admin_session_terminated',
      reason,
    });

    await adminClient.from('security_audit_events').insert({
      actor_id: adminUser.id,
      event_type: 'session_terminated_by_admin',
      target_id: sessionId,
      details: { reason },
    });
  }

  return { success: true };
}

/**
 * Admin live location read with Mandatory Audit Logging.
 * Fails closed if audit event cannot be recorded.
 */
export async function getAdminSessionLocation(sessionId: string, reason: string = 'Admin Map Overview') {
  const adminUser = await requireSuperAdmin();
  const adminClient = createAdminClient();

  // 1. Fetch session status
  const { data: session, error: sessErr } = await adminClient
    .from('sharing_sessions')
    .select('id, status, expires_at')
    .eq('id', sessionId)
    .single();

  if (sessErr || !session || session.status !== 'active') {
    throw new Error('Location inaccessible: Session is not active.');
  }

  if (session.expires_at && new Date(session.expires_at) <= new Date()) {
    throw new Error('Location inaccessible: Session has expired.');
  }

  // 2. Mandatory Audit Event Recording BEFORE returning location data
  const { error: auditErr } = await adminClient.from('admin_access_events').insert({
    admin_id: adminUser.id,
    session_id: sessionId,
    access_type: 'admin_live_map_view',
    reason,
  });

  if (auditErr) {
    // Audit failure MUST block sensitive location disclosure!
    console.error('Audit logging failed, denying location disclosure:', auditErr);
    throw new Error('Security Audit Failure: Location read denied because audit logging failed.');
  }

  // 3. Retrieve current single location
  const { data: location } = await adminClient
    .from('current_locations')
    .select('latitude, longitude, accuracy_meters, recorded_at, updated_at')
    .eq('session_id', sessionId)
    .maybeSingle();

  return location;
}

/**
 * Get Security Audit logs and Admin Access Events for /admin/security.
 */
export async function getSecurityAuditLogs() {
  await requireSuperAdmin();
  const adminClient = createAdminClient();

  const [{ data: auditEvents }, { data: accessEvents }] = await Promise.all([
    adminClient.from('security_audit_events').select('*').order('created_at', { ascending: false }).limit(50),
    adminClient.from('admin_access_events').select('*').order('accessed_at', { ascending: false }).limit(50),
  ]);

  return {
    securityAuditEvents: (auditEvents as SecurityAuditEventItem[]) || [],
    adminAccessEvents: accessEvents || [],
  };
}

/**
 * Get operational platform settings for /admin/settings.
 */
export async function getPlatformSettings(): Promise<PlatformSettingItem[]> {
  await requireSuperAdmin();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('platform_settings')
    .select('*')
    .order('key', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as PlatformSettingItem[];
}

/**
 * Update an operational platform setting.
 */
export async function updatePlatformSetting(key: string, value: string) {
  const adminUser = await requireSuperAdmin();

  if (!key || value === undefined) {
    throw new Error('Key and value are required.');
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient.from('platform_settings').upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
    updated_by: adminUser.id,
  });

  if (error) {
    throw new Error('Failed to update platform setting.');
  }

  // Log security audit event
  await adminClient.from('security_audit_events').insert({
    actor_id: adminUser.id,
    event_type: 'setting_updated',
    target_id: key,
    details: { newValue: value },
  });

  return { success: true };
}
