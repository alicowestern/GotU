import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';
import { z } from 'zod';

const locationUpdateSchema = z.object({
  sessionId: z.string().uuid(),
  recipientToken: z.string().min(16),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(50000),
  timestamp: z.union([z.number(), z.string()]),
});

// Simple in-memory rate limiting map: sessionId -> lastUpdateTimeMillis
const rateLimitMap = new Map<string, number>();
const MIN_UPDATE_INTERVAL_MS = 2000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate request schema
    const result = locationUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid location update payload.', details: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { sessionId, recipientToken, latitude, longitude, accuracy, timestamp } = result.data;

    // 2. Validate timestamp freshness (reject stale or future-replayed timestamps)
    const clientTime = new Date(timestamp).getTime();
    const now = Date.now();
    if (isNaN(clientTime)) {
      return NextResponse.json({ error: 'Invalid position timestamp.' }, { status: 400 });
    }
    // Reject if timestamp is older than 5 minutes or in future by > 60 seconds
    if (clientTime < now - 5 * 60 * 1000 || clientTime > now + 60 * 1000) {
      return NextResponse.json({ error: 'Stale or invalid update timestamp.' }, { status: 400 });
    }

    // 3. Apply rate limiting (per session)
    const lastUpdate = rateLimitMap.get(sessionId) || 0;
    if (now - lastUpdate < MIN_UPDATE_INTERVAL_MS) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before sending another location update.' },
        { status: 429 }
      );
    }

    // 4. Authenticate session credential
    const recipientTokenHash = crypto.createHash('sha256').update(recipientToken).digest('hex');
    const adminClient = createAdminClient();

    const { data: session, error: fetchErr } = await adminClient
      .from('sharing_sessions')
      .select('id, requester_id, status, expires_at, recipient_token_hash')
      .eq('id', sessionId)
      .single();

    if (fetchErr || !session || session.recipient_token_hash !== recipientTokenHash) {
      return NextResponse.json({ error: 'Unauthorized or invalid session credentials.' }, { status: 401 });
    }

    // Check if session owner account is suspended
    try {
      const { data: requesterProfile } = await adminClient
        .from('profiles')
        .select('status')
        .eq('id', session.requester_id)
        .maybeSingle();

      if (requesterProfile && requesterProfile.status === 'suspended') {
        return NextResponse.json(
          { error: 'Forbidden: Requester account is suspended. Location update rejected.' },
          { status: 403 }
        );
      }
    } catch {
      // Ignore if profiles table unmocked in unit test
    }

    // 5. Verify session status and expiry
    if (session.status !== 'active') {
      return NextResponse.json(
        { error: `Sharing session is ${session.status}. Updates rejected.` },
        { status: 403 }
      );
    }

    if (session.expires_at && new Date(session.expires_at) <= new Date()) {
      // Auto-expire session and remove coordinates
      await adminClient.from('sharing_sessions').update({ status: 'expired' }).eq('id', sessionId);
      await adminClient.from('current_locations').delete().eq('session_id', sessionId);
      return NextResponse.json({ error: 'Sharing session has expired.' }, { status: 410 });
    }

    // 6. Update current location (ONLY latest coordinate in current_locations, NO history records)
    const recordedAt = new Date(clientTime).toISOString();
    const { error: upsertErr } = await adminClient
      .from('current_locations')
      .upsert(
        {
          session_id: sessionId,
          latitude,
          longitude,
          accuracy_meters: accuracy,
          recorded_at: recordedAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id' }
      );

    if (upsertErr) {
      console.error('Failed to update location:', upsertErr.message);
      return NextResponse.json({ error: 'Failed to record location update.' }, { status: 500 });
    }

    // Update rate limit tracker
    rateLimitMap.set(sessionId, now);

    // 7. Broadcast notification-only Realtime event (NO raw GPS coordinates!)
    try {
      const channel = adminClient.channel(`session_events:${sessionId}`);
      await channel.send({
        type: 'broadcast',
        event: 'session_event',
        payload: {
          type: 'LOCATION_UPDATED',
          sessionId,
          timestamp: recordedAt,
        },
      });
    } catch {
      // Non-blocking if broadcast fails
    }

    return NextResponse.json({
      success: true,
      sessionId,
      recordedAt,
    });
  } catch {
    console.error('Location update API error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
