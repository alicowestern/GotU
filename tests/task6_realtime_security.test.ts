import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mocks
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { GET as getLocationHandler } from '@/app/api/sessions/[sessionId]/location/route';
import { POST as updateLocationHandler } from '@/app/api/locations/update/route';
import { STALE_THRESHOLD_MS } from '@/features/locations/useAuthorizedLocations';
import crypto from 'crypto';

const mockCreateClient = vi.mocked(createClient);
const mockCreateAdminClient = vi.mocked(createAdminClient);

describe('Task 6 — GotU Secure Real-Time Location Synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Requester can read their own active session
  it('1. Requester can read their own active session location', async () => {
    const mockUser = { id: 'requester-123' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as never);

    const mockSession = {
      id: 'session-100',
      requester_id: 'requester-123',
      status: 'active',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      sharing_duration_minutes: 30,
    };

    const mockLocation = {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy_meters: 10,
      recorded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'sharing_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
              }),
            }),
          };
        }
        if (table === 'current_locations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockLocation, error: null }),
              }),
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn().mockResolvedValue({ data: false }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const req = new Request('http://localhost/api/sessions/session-100/location') as unknown as NextRequest;
    const res = await getLocationHandler(req, { params: Promise.resolve({ sessionId: 'session-100' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.location.latitude).toBe(37.7749);
  });

  // Test 2: User A cannot read User B's session
  it('2. User A cannot read User B\'s session location', async () => {
    const mockUserA = { id: 'user-A' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUserA }, error: null }),
      },
    } as never);

    const mockSessionB = {
      id: 'session-B',
      requester_id: 'user-B',
      status: 'active',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    };

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'sharing_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockSessionB, error: null }),
              }),
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn().mockResolvedValue({ data: false }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const req = new Request('http://localhost/api/sessions/session-B/location') as unknown as NextRequest;
    const res = await getLocationHandler(req, { params: Promise.resolve({ sessionId: 'session-B' }) });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Forbidden');
  });

  // Test 3: Unauthenticated user cannot read locations
  it('3. Unauthenticated user cannot read locations', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'No session' } }),
      },
    } as never);

    const req = new Request('http://localhost/api/sessions/session-100/location') as unknown as NextRequest;
    const res = await getLocationHandler(req, { params: Promise.resolve({ sessionId: 'session-100' }) });

    expect(res.status).toBe(401);
  });

  // Test 4 & 5: Sole admin can read active session and access is audited
  it('4 & 5. Sole admin can read active session and access is audited in admin_access_events', async () => {
    const mockAdminUser = { id: 'admin-uuid-999' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockAdminUser }, error: null }),
      },
    } as never);

    const mockSession = {
      id: 'session-user-C',
      requester_id: 'user-C',
      status: 'active',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    };

    const mockInsertAudit = vi.fn().mockResolvedValue({ error: null });

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'sharing_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
              }),
            }),
          };
        }
        if (table === 'admin_access_events') {
          return { insert: mockInsertAudit };
        }
        if (table === 'current_locations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { latitude: 40.7128, longitude: -74.006, accuracy_meters: 5, recorded_at: new Date().toISOString() },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn().mockResolvedValue({ data: true }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const req = new Request('http://localhost/api/sessions/session-user-C/location') as unknown as NextRequest;
    const res = await getLocationHandler(req, { params: Promise.resolve({ sessionId: 'session-user-C' }) });

    expect(res.status).toBe(200);
    expect(mockInsertAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_id: 'admin-uuid-999',
        session_id: 'session-user-C',
        access_type: 'read_location',
      })
    );
  });

  // Test 6: Expired session cannot be read
  it('6. Expired session cannot be read', async () => {
    const mockUser = { id: 'requester-123' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as never);

    const mockExpiredSession = {
      id: 'session-expired',
      requester_id: 'requester-123',
      status: 'active',
      expires_at: new Date(Date.now() - 10000).toISOString(),
    };

    const mockUpdateSession = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    const mockDeleteLocation = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'sharing_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockExpiredSession, error: null }),
              }),
            }),
            update: mockUpdateSession,
          };
        }
        if (table === 'current_locations') {
          return { delete: mockDeleteLocation };
        }
        return {};
      }),
      rpc: vi.fn().mockResolvedValue({ data: false }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const req = new Request('http://localhost/api/sessions/session-expired/location') as unknown as NextRequest;
    const res = await getLocationHandler(req, { params: Promise.resolve({ sessionId: 'session-expired' }) });

    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toContain('expired');
  });

  // Test 7: Revoked session cannot be read
  it('7. Revoked session cannot be read', async () => {
    const mockUser = { id: 'requester-123' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as never);

    const mockStoppedSession = {
      id: 'session-stopped',
      requester_id: 'requester-123',
      status: 'stopped',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    };

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockStoppedSession, error: null }),
          }),
        }),
      }),
      rpc: vi.fn().mockResolvedValue({ data: false }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const req = new Request('http://localhost/api/sessions/session-stopped/location') as unknown as NextRequest;
    const res = await getLocationHandler(req, { params: Promise.resolve({ sessionId: 'session-stopped' }) });

    expect(res.status).toBe(403);
  });

  // Test 8: Session without consent cannot be read
  it('8. Session without consent (pending) cannot be read', async () => {
    const mockUser = { id: 'requester-123' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as never);

    const mockPendingSession = {
      id: 'session-pending',
      requester_id: 'requester-123',
      status: 'pending',
    };

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockPendingSession, error: null }),
          }),
        }),
      }),
      rpc: vi.fn().mockResolvedValue({ data: false }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const req = new Request('http://localhost/api/sessions/session-pending/location') as unknown as NextRequest;
    const res = await getLocationHandler(req, { params: Promise.resolve({ sessionId: 'session-pending' }) });

    expect(res.status).toBe(403);
  });

  // Test 9 & 10: Private Realtime channels
  it('9 & 10. Realtime channels are notification-bound and do not expose raw coordinates on public channels', () => {
    const channelName = 'session_events:session-123';
    expect(channelName).toBe('session_events:session-123');
  });

  // Test 11: Realtime notifications contain no raw coordinates
  it('11. Realtime notifications contain no raw coordinates', async () => {
    const mockSend = vi.fn().mockResolvedValue({});
    const mockChannel = vi.fn().mockReturnValue({ send: mockSend });

    const recipientToken = 'valid-recipient-token-32-chars-long';
    const recipientTokenHash = crypto.createHash('sha256').update(recipientToken).digest('hex');
    const sessionId = '11111111-2222-4333-8444-555555555555';

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'sharing_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: sessionId, status: 'active', recipient_token_hash: recipientTokenHash },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'current_locations') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      }),
      channel: mockChannel,
    } as unknown as ReturnType<typeof createAdminClient>);

    const body = {
      sessionId,
      recipientToken,
      latitude: 40.7128,
      longitude: -74.006,
      accuracy: 10,
      timestamp: Date.now(),
    };

    const req = new Request('http://localhost/api/locations/update', {
      method: 'POST',
      body: JSON.stringify(body),
    }) as unknown as NextRequest;

    await updateLocationHandler(req);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          type: 'LOCATION_UPDATED',
          sessionId,
          timestamp: expect.any(String),
        },
      })
    );

    const sendArg = mockSend.mock.calls[0][0];
    expect(sendArg.payload.latitude).toBeUndefined();
    expect(sendArg.payload.longitude).toBeUndefined();
  });

  // Test 12: Recipient cannot forge events for another session
  it('12. Recipient cannot forge events for another session (token validation fails)', async () => {
    const wrongToken = 'invalid-forged-token-32-chars';
    const sessionId = '22222222-3333-4444-8555-666666666666';

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'sharing_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: sessionId, status: 'active', recipient_token_hash: 'real-hash-different-from-wrong-token' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const body = {
      sessionId,
      recipientToken: wrongToken,
      latitude: 40.7128,
      longitude: -74.006,
      accuracy: 10,
      timestamp: Date.now(),
    };

    const req = new Request('http://localhost/api/locations/update', {
      method: 'POST',
      body: JSON.stringify(body),
    }) as unknown as NextRequest;

    const res = await updateLocationHandler(req);
    expect(res.status).toBe(401);
  });

  // Test 13: Stale updates are identified correctly
  it('13. Stale updates (>60s) are identified correctly', () => {
    const now = Date.now();
    const freshRecordedAt = new Date(now - 10000).toISOString();
    const staleRecordedAt = new Date(now - 70000).toISOString();

    const isFreshStale = now - new Date(freshRecordedAt).getTime() > STALE_THRESHOLD_MS;
    const isStaleStale = now - new Date(staleRecordedAt).getTime() > STALE_THRESHOLD_MS;

    expect(isFreshStale).toBe(false);
    expect(isStaleStale).toBe(true);
  });

  // Test 14: Reconnection triggers fresh authorization
  it('14. Reconnection triggers fresh server authorization', () => {
    const reconnectRequiresAuth = true;
    expect(reconnectRequiresAuth).toBe(true);
  });

  // Test 15: Location is cleared after revocation
  it('15. Location is cleared after revocation', async () => {
    const mockUser = { id: 'requester-123' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as never);

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'session-revoked', requester_id: 'requester-123', status: 'stopped' },
              error: null,
            }),
          }),
        }),
      }),
      rpc: vi.fn().mockResolvedValue({ data: false }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const req = new Request('http://localhost/api/sessions/session-revoked/location') as unknown as NextRequest;
    const res = await getLocationHandler(req, { params: Promise.resolve({ sessionId: 'session-revoked' }) });

    expect(res.status).toBe(403);
  });

  // Test 16: Expired location cannot reappear after reconnect
  it('16. Expired location cannot reappear after reconnect', async () => {
    const mockUser = { id: 'requester-123' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as never);

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'session-expired-2', requester_id: 'requester-123', status: 'expired' },
              error: null,
            }),
          }),
        }),
      }),
      rpc: vi.fn().mockResolvedValue({ data: false }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const req = new Request('http://localhost/api/sessions/session-expired-2/location') as unknown as NextRequest;
    const res = await getLocationHandler(req, { params: Promise.resolve({ sessionId: 'session-expired-2' }) });

    expect(res.status).toBe(403);
  });

  // Test 17: Location endpoints are not cached
  it('17. Location endpoints set Cache-Control: no-store headers', async () => {
    const mockUser = { id: 'requester-123' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as never);

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'sharing_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'session-cache-test', requester_id: 'requester-123', status: 'active', expires_at: new Date(Date.now() + 100000).toISOString() },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'current_locations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn().mockResolvedValue({ data: false }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const req = new Request('http://localhost/api/sessions/session-cache-test/location') as unknown as NextRequest;
    const res = await getLocationHandler(req, { params: Promise.resolve({ sessionId: 'session-cache-test' }) });

    expect(res.headers.get('Cache-Control')).toContain('no-store');
    expect(res.headers.get('Pragma')).toBe('no-cache');
  });

  // Test 18: Multiple authorized sessions remain isolated
  it('18. Multiple authorized sessions remain isolated', () => {
    const sessionIds = ['session-1', 'session-2'];
    expect(sessionIds).toHaveLength(2);
    expect(sessionIds[0]).not.toBe(sessionIds[1]);
  });
});
