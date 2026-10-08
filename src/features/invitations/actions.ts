'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import crypto from 'crypto';

const createInvitationSchema = z.object({
  purpose: z.string().min(1).max(300),
  recipientLabel: z.string().optional(),
  expiryHours: z.enum(['0.25', '1', '24']),
  message: z.string().max(500).optional(),
});

export async function createInvitation(state: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .maybeSingle();

  if (profile && profile.status === 'suspended') {
    return { error: 'Your account is currently suspended.' };
  }

  const purpose = formData.get('purpose') as string;
  const recipientLabel = formData.get('recipientLabel') as string;
  const expiryHours = formData.get('expiryHours') as string;
  const message = formData.get('message') as string;

  const result = createInvitationSchema.safeParse({
    purpose,
    recipientLabel,
    expiryHours,
    message,
  });

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  // Generate secure token
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const expiresAt = new Date(Date.now() + parseFloat(result.data.expiryHours) * 60 * 60 * 1000);

  const { data, error } = await adminClient
    .from('sharing_invitations')
    .insert({
      requester_id: user.id,
      token_hash: tokenHash,
      purpose: result.data.purpose,
      recipient_label: result.data.recipientLabel || null,
      expires_at: expiresAt.toISOString(),
      status: 'active',
      personal_message: result.data.message || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating invitation:', error);
    return { error: 'Failed to create invitation' };
  }

  revalidatePath('/dashboard/invitations');
  
  // Return the raw token ONLY ONCE. It cannot be recovered.
  return { success: true, rawToken, invitation: data };
}

export async function getMyInvitations() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('sharing_invitations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invitations:', error);
    return [];
  }

  return data;
}

export async function revokeInvitation(invitationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  const adminClient = createAdminClient();
  
  // Verify ownership first
  const { data: inv, error: fetchErr } = await supabase
    .from('sharing_invitations')
    .select('id')
    .eq('id', invitationId)
    .single();

  if (fetchErr || !inv) {
    return { error: 'Invitation not found or unauthorized' };
  }

  const { error } = await adminClient
    .from('sharing_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId);

  if (error) {
    return { error: 'Failed to revoke invitation' };
  }

  revalidatePath('/dashboard/invitations');
  return { success: true };
}

export async function validatePublicToken(rawToken: string) {
  if (!rawToken || typeof rawToken !== 'string') {
    return { error: 'Invalid token format' };
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('sharing_invitations')
    .select('id, purpose, personal_message, recipient_label, status, expires_at, requester_id, profiles ( full_name )')
    .eq('token_hash', tokenHash)
    .single();

  if (error || !data) {
    return { error: 'Invitation not found or invalid.' };
  }

  if (data.status !== 'active') {
    return { error: `Invitation is ${data.status}.` };
  }

  if (new Date(data.expires_at) < new Date()) {
    // Auto-expire
    await adminClient.from('sharing_invitations').update({ status: 'expired' }).eq('id', data.id);
    return { error: 'Invitation has expired.' };
  }

  return {
    success: true,
    invitation: {
      id: data.id,
      purpose: data.purpose,
      personalMessage: data.personal_message,
      requesterName: (data.profiles as unknown as { full_name: string | null })?.full_name || 'A user',
      expiresAt: data.expires_at,
    }
  };
}
