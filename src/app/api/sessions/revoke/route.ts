import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';
import { z } from 'zod';

const revokeSchema = z.object({
  sessionId: z.string().uuid(),
  recipientToken: z.string().min(16),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const result = revokeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid revoke request.' }, { status: 400 });
    }

    const { sessionId, recipientToken } = result.data;
    const recipientTokenHash = crypto.createHash('sha256').update(recipientToken).digest('hex');

    const adminClient = createAdminClient();

    // Call atomic revocation RPC
    const { data: success, error } = await adminClient.rpc('revoke_session_by_recipient', {
      p_session_id: sessionId,
      p_recipient_token_hash: recipientTokenHash,
    });

    if (error || !success) {
      return NextResponse.json({ error: 'Failed to revoke session or unauthorized.' }, { status: 401 });
    }

    // Broadcast SESSION_STOPPED event
    try {
      const channel = adminClient.channel(`session_events:${sessionId}`);
      await channel.send({
        type: 'broadcast',
        event: 'session_event',
        payload: {
          type: 'SESSION_STOPPED',
          sessionId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      message: 'Sharing session stopped and access revoked.',
    });
  } catch {
    console.error('Session revoke API error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
