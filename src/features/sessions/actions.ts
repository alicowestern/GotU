'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type AuthorizedSessionSummary = {
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
  recipient_label: string | null;
  purpose: string | null;
};

type DbSessionQueryResult = {
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
  sharing_invitations: { recipient_label: string | null; purpose: string | null } | { recipient_label: string | null; purpose: string | null }[] | null;
};

/**
 * Retrieves all sharing sessions owned by the authenticated requester.
 * Joins with sharing_invitations to retrieve recipient_label and purpose.
 */
export async function getMyAuthorizedSessions(): Promise<AuthorizedSessionSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

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
      sharing_invitations (
        recipient_label,
        purpose
      )
    `
    )
    .eq('requester_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !sessions) {
    console.error('Error fetching authorized sessions:', error);
    return [];
  }

  const typedSessions = sessions as unknown as DbSessionQueryResult[];

  return typedSessions.map((s) => {
    const inv = Array.isArray(s.sharing_invitations)
      ? s.sharing_invitations[0] || null
      : s.sharing_invitations;

    return {
      id: s.id,
      invitation_id: s.invitation_id,
      requester_id: s.requester_id,
      status: s.status,
      sharing_duration_minutes: s.sharing_duration_minutes,
      consent_granted_at: s.consent_granted_at,
      started_at: s.started_at,
      expires_at: s.expires_at,
      stopped_at: s.stopped_at,
      created_at: s.created_at,
      recipient_label: inv?.recipient_label || null,
      purpose: inv?.purpose || null,
    };
  });
}
