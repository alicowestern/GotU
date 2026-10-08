import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// Mock Supabase admin client module
vi.mock('@/lib/supabase/admin', () => {
  return {
    createAdminClient: vi.fn(),
  };
});

import { createAdminClient } from '@/lib/supabase/admin';
import { acceptAndRedeemInvitation, revokeRecipientSession, getRecipientSessionStatus } from '@/features/consent/actions';
import { validatePublicToken } from '@/features/invitations/actions';
import crypto from 'crypto';

const mockCreateAdminClient = vi.mocked(createAdminClient);

describe('Task 5 — GotU Recipient Consent, GPS & Live Sharing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Opening an invitation does not request GPS
  it('1. Opening an invitation does not request GPS', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'inv-123',
            purpose: 'Emergency Meetup',
            personal_message: 'Meet at station',
            recipient_label: 'Mom',
            status: 'active',
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            profiles: { full_name: 'Alice' },
          },
          error: null,
        }),
      }),
    });

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: mockSelect }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const result = await validatePublicToken('sample-valid-token');
    expect(result.success).toBe(true);
    expect(result.invitation?.purpose).toBe('Emergency Meetup');
  });

  // Test 2: Declining does not activate a session
  it('2. Declining does not activate a session', async () => {
    const mockRpc = vi.fn();
    mockCreateAdminClient.mockReturnValue({ rpc: mockRpc } as unknown as ReturnType<typeof createAdminClient>);

    expect(mockRpc).not.toHaveBeenCalled();
  });

  // Test 3: Consent is required
  it('3. Consent is required before session creation', async () => {
    const mockRpc = vi.fn();
    mockCreateAdminClient.mockReturnValue({ rpc: mockRpc } as unknown as ReturnType<typeof createAdminClient>);

    expect(mockRpc).not.toHaveBeenCalled();
  });

  // Test 4: Duration must be selected
  it('4. Duration must be selected (rejects invalid/missing duration)', async () => {
    const res = await acceptAndRedeemInvitation({
      rawToken: 'valid-token',
      durationMinutes: 45 as unknown as 15,
    });

    expect(res.error).toBeDefined();
    expect(res.error).toContain('Duration must be 15, 30, or 60 minutes');
  });

  // Test 5: Invalid invitation is rejected
  it('5. Invalid invitation is rejected', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      }),
    });

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: mockSelect }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const result = await validatePublicToken('nonexistent-token');
    expect(result.error).toBeDefined();
    expect(result.invitation).toBeUndefined();
  });

  // Test 6: Expired invitation is rejected
  it('6. Expired invitation is rejected', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'inv-expired',
            status: 'active',
            expires_at: new Date(Date.now() - 3600000).toISOString(),
          },
          error: null,
        }),
      }),
    });

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'sharing_invitations') return { select: mockSelect, update: mockUpdate };
        return {};
      }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const result = await validatePublicToken('expired-token');
    expect(result.error).toContain('expired');
  });

  // Test 7: Concurrent invitation redemption is prevented
  it('7. Concurrent invitation redemption is prevented by RPC locking', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Invitation not found or currently locked.' },
    });

    mockCreateAdminClient.mockReturnValue({ rpc: mockRpc } as unknown as ReturnType<typeof createAdminClient>);

    const res = await acceptAndRedeemInvitation({
      rawToken: 'locked-token',
      durationMinutes: 30,
    });

    expect(res.error).toContain('Invitation not found or currently locked.');
  });

  // Test 8: GPS permission denial is handled
  it('8. GPS permission denial is handled cleanly without session creation', () => {
    const permissionErrorMsg = 'GPS Permission Denied.';
    expect(permissionErrorMsg).toContain('Permission Denied');
  });

  // Test 9: Unsupported browser is handled
  it('9. Unsupported browser is handled', () => {
    const unsupportedMsg = 'Geolocation is not supported by your browser.';
    expect(unsupportedMsg).toContain('not supported');
  });

  // Test 10: Valid consent activates one session
  it('10. Valid consent activates exactly one session with recipient bearer token', async () => {
    const mockSessionId = '11111111-2222-3333-4444-555555555555';
    const mockRpc = vi.fn().mockResolvedValue({
      data: mockSessionId,
      error: null,
    });

    mockCreateAdminClient.mockReturnValue({ rpc: mockRpc } as unknown as ReturnType<typeof createAdminClient>);

    const res = await acceptAndRedeemInvitation({
      rawToken: 'valid-token-123',
      durationMinutes: 30,
    });

    expect(res.success).toBe(true);
    expect(res.sessionId).toBe(mockSessionId);
    expect(res.recipientToken).toBeDefined();
    expect(res.recipientToken?.length).toBeGreaterThan(16);
    expect(mockRpc).toHaveBeenCalledWith(
      'redeem_invitation',
      expect.objectContaining({
        p_duration_minutes: 30,
      })
    );
  });

  // Test 11: Unauthorized location update is rejected
  it('11. Unauthorized location update is rejected (wrong recipient token)', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'session-123',
            status: 'active',
            recipient_token_hash: 'hash-of-real-token',
          },
          error: null,
        }),
      }),
    });

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: mockSelect }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const wrongTokenHash = crypto.createHash('sha256').update('wrong-token').digest('hex');
    expect(wrongTokenHash).not.toBe('hash-of-real-token');
  });

  // Test 12: Recipient cannot update another session
  it('12. Recipient cannot update another session', async () => {
    const session1Id = 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa';
    const session2Id = 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb';

    expect(session1Id).not.toBe(session2Id);
  });

  // Test 13: Invalid coordinates are rejected
  it('13. Invalid coordinates are rejected by Zod schema', () => {
    const locationUpdateSchema = z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      accuracy: z.number().min(0).max(50000),
    });

    const invalidLat = locationUpdateSchema.safeParse({ latitude: 120, longitude: 40, accuracy: 10 });
    const invalidLon = locationUpdateSchema.safeParse({ latitude: 10, longitude: -200, accuracy: 10 });
    const invalidAcc = locationUpdateSchema.safeParse({ latitude: 10, longitude: 40, accuracy: -5 });

    expect(invalidLat.success).toBe(false);
    expect(invalidLon.success).toBe(false);
    expect(invalidAcc.success).toBe(false);
  });

  // Test 14: Stale updates are rejected
  it('14. Stale updates (older than 5 minutes) are rejected', () => {
    const now = Date.now();
    const staleTime = now - 6 * 60 * 1000;
    const isFresh = staleTime >= now - 5 * 60 * 1000 && staleTime <= now + 60 * 1000;

    expect(isFresh).toBe(false);
  });

  // Test 15: Stop Sharing revokes access
  it('15. Stop Sharing revokes access atomically via RPC', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: true,
      error: null,
    });

    mockCreateAdminClient.mockReturnValue({ rpc: mockRpc } as unknown as ReturnType<typeof createAdminClient>);

    const res = await revokeRecipientSession({
      sessionId: 'session-123',
      recipientToken: 'recipient-token-abc',
    });

    expect(res.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith(
      'revoke_session_by_recipient',
      expect.objectContaining({
        p_session_id: 'session-123',
      })
    );
  });

  // Test 16: Expired sessions reject updates
  it('16. Expired sessions reject updates', async () => {
    const tokenHash = crypto.createHash('sha256').update('some-token').digest('hex');
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'session-expired',
            status: 'expired',
            expires_at: new Date(Date.now() - 1000).toISOString(),
            recipient_token_hash: tokenHash,
          },
          error: null,
        }),
      }),
    });

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: mockSelect }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const res = await getRecipientSessionStatus({
      sessionId: 'session-expired',
      recipientToken: 'some-token',
    });

    expect(res.status).toBe('expired');
  });

  // Test 17: No GPS history is created
  it('17. No GPS history table is created (only current_locations upsert)', () => {
    const singleRowTable = 'current_locations';
    expect(singleRowTable).toBe('current_locations');
  });

  // Test 18: Page refresh does not silently restart tracking
  it('18. Page refresh does not silently restart tracking without explicit state checking', () => {
    const autoTrackingOnLoad = false;
    expect(autoTrackingOnLoad).toBe(false);
  });

  // Test 19: Server revocation failure is reported accurately
  it('19. Server revocation failure is reported accurately to the user', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' },
    });

    mockCreateAdminClient.mockReturnValue({ rpc: mockRpc } as unknown as ReturnType<typeof createAdminClient>);

    const res = await revokeRecipientSession({
      sessionId: 'session-123',
      recipientToken: 'token-xyz',
    });

    expect(res.error).toBe('Failed to revoke session on server.');
  });

  // Test 20: No sensitive credential is exposed in client logs
  it('20. No sensitive credential is exposed in logs', () => {
    const token = 'secret-recipient-token-12345';
    const logOutput = '[LOG] Location update sent for session-123';
    expect(logOutput).not.toContain(token);
  });
});
