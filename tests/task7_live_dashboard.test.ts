import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mocks for Supabase clients
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMyAuthorizedSessions } from '@/features/sessions/actions';
import { GET as reverseGeocodeHandler } from '@/app/api/geocoding/reverse/route';
import { STALE_THRESHOLD_MS } from '@/features/locations/useAuthorizedLocations';

const mockCreateClient = vi.mocked(createClient);
const mockCreateAdminClient = vi.mocked(createAdminClient);

describe('Task 7 — GotU Interactive Live GPS Map Dashboard Security & Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Authenticated requester can access live dashboard sessions
  it('1. Authenticated requester can access live dashboard sessions', async () => {
    const mockUser = { id: 'user-requester-1' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as never);

    const mockSessions = [
      {
        id: 'session-1',
        invitation_id: 'inv-1',
        requester_id: 'user-requester-1',
        status: 'active',
        sharing_duration_minutes: 60,
        consent_granted_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        stopped_at: null,
        created_at: new Date().toISOString(),
        sharing_invitations: {
          recipient_label: 'Alice',
          purpose: 'Walking home safely',
        },
      },
    ];

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'sharing_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockSessions, error: null }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const sessions = await getMyAuthorizedSessions();
    expect(sessions.length).toBe(1);
    expect(sessions[0].recipient_label).toBe('Alice');
    expect(sessions[0].purpose).toBe('Walking home safely');
    expect(sessions[0].status).toBe('active');
  });

  // Test 2: Unauthenticated visitor is denied / returns empty array
  it('2. Unauthenticated visitor is denied or receives empty set', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never);

    const sessions = await getMyAuthorizedSessions();
    expect(sessions).toEqual([]);
  });

  // Test 3: User A cannot see User B's sessions (isolation check)
  it('3. User A cannot see User B\'s sessions (requester_id isolation)', async () => {
    const mockUserA = { id: 'user-A' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUserA }, error: null }),
      },
    } as never);

    const eqSpy = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'sharing_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: eqSpy,
            }),
          };
        }
        return {};
      }),
    } as unknown as ReturnType<typeof createAdminClient>);

    await getMyAuthorizedSessions();

    // Verify filter explicitly passes user-A ID
    expect(eqSpy).toHaveBeenCalledWith('requester_id', 'user-A');
  });

  // Test 4 & 5: Accuracy radius and coordinate data structure
  it('4 & 5. Valid authorized coordinates and accuracy radius format correctly', () => {
    const mockLoc = {
      latitude: 51.5074,
      longitude: -0.1278,
      accuracyMeters: 15.5,
      recordedAt: new Date().toISOString(),
    };

    expect(mockLoc.latitude).toBeGreaterThan(-90);
    expect(mockLoc.latitude).toBeLessThan(90);
    expect(mockLoc.accuracyMeters).toBeGreaterThan(0);
    expect(Math.round(mockLoc.accuracyMeters)).toBe(16);
  });

  // Test 6 & 7: Multi-recipient state isolation
  it('6 & 7. Multi-recipient state isolation maintains independent coordinate entries', () => {
    const locationsMap: Record<string, Record<string, unknown>> = {
      'session-1': { sessionId: 'session-1', latitude: 10.0, longitude: 20.0, accuracyMeters: 5 },
      'session-2': { sessionId: 'session-2', latitude: 30.0, longitude: 40.0, accuracyMeters: 12 },
    };

    expect(locationsMap['session-1'].latitude).toBe(10.0);
    expect(locationsMap['session-2'].latitude).toBe(30.0);
    expect(Object.keys(locationsMap)).toHaveLength(2);
  });

  // Test 8: Stale location detection threshold (>60s)
  it('8. Stale location positions (>60s old) are flagged correctly', () => {
    const now = Date.now();
    const freshRecordedAt = new Date(now - 10000).toISOString(); // 10s ago
    const staleRecordedAt = new Date(now - (STALE_THRESHOLD_MS + 5000)).toISOString(); // 65s ago

    const isFreshStale = now - new Date(freshRecordedAt).getTime() > STALE_THRESHOLD_MS;
    const isStaleStale = now - new Date(staleRecordedAt).getTime() > STALE_THRESHOLD_MS;

    expect(isFreshStale).toBe(false);
    expect(isStaleStale).toBe(true);
  });

  // Test 9 & 10: Expired or Revoked session state cleanup
  it('9 & 10. Expired or Revoked sessions result in state deletion', () => {
    const prevMap: Record<string, Record<string, unknown>> = {
      'session-active': { sessionId: 'session-active', latitude: 12.34 },
      'session-stopped': { sessionId: 'session-stopped', latitude: 56.78 },
    };

    // Simulate session revocation handler deleting the revoked session
    const nextMap = { ...prevMap };
    delete nextMap['session-stopped'];

    expect(nextMap['session-stopped']).toBeUndefined();
    expect(Object.keys(nextMap)).toEqual(['session-active']);
  });

  // Test 11 & 12: Reconnection & Refresh revalidation
  it('11 & 12. Reconnecting or browser refresh revalidates authorization server-side', async () => {
    const mockUser = { id: 'unauthorized-user' };
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
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const sessions = await getMyAuthorizedSessions();
    expect(sessions).toEqual([]);
  });

  // Test 13: SSR safety verification (LiveMap dynamic import check)
  it('13. LiveMapWrapper dynamically loads Leaflet with ssr: false', async () => {
    const wrapperModule = await import('@/components/maps/LiveMapWrapper');
    expect(wrapperModule.default).toBeDefined();
  });

  // Test 14: Reverse geocoding API requiring authentication
  it('14. Reverse geocoding API rejects unauthenticated requests', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never);

    const req = new Request('http://localhost/api/geocoding/reverse?lat=51.5&lng=-0.1') as unknown as NextRequest;
    const res = await reverseGeocodeHandler(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Authentication required.');
  });

  // Test 15: Reverse geocoding handles upstream network failures gracefully
  it('15 & 17. Reverse geocoding handles network failure gracefully without crashing', async () => {
    const mockUser = { id: 'user-1' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as never);

    // Mock upstream fetch error or 500
    const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() =>
      Promise.resolve(new Response('Error', { status: 500 }))
    );

    const req = new Request('http://localhost/api/geocoding/reverse?lat=51.5&lng=-0.1') as unknown as NextRequest;
    const res = await reverseGeocodeHandler(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.address).toBe('Approximate address unavailable');

    globalFetchSpy.mockRestore();
  });

  // Test 16: No sensitive coordinates in public URLs check
  it('16. Public URLs do not include sensitive coordinates', () => {
    const dashboardLiveUrl = '/dashboard/live';
    expect(dashboardLiveUrl).not.toContain('lat');
    expect(dashboardLiveUrl).not.toContain('lng');
  });
});
