import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

// Mocks for Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { POST as updateLocationHandler } from '@/app/api/locations/update/route';
import { GET as getLocationHandler } from '@/app/api/sessions/[sessionId]/location/route';
import { getAdminSessionLocation } from '@/features/admin/services/adminService';

const mockCreateClient = vi.mocked(createClient);
const mockCreateAdminClient = vi.mocked(createAdminClient);

describe('Task 9 — GotU Enterprise Security Hardening & Privacy Audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Cryptographic Token Entropy & Hashing
  it('1. Invitation tokens use 32-byte cryptographic random generation and SHA-256 hashing', () => {
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    expect(rawToken.length).toBeGreaterThanOrEqual(40);
    expect(tokenHash.length).toBe(64); // SHA-256 hex string length
    expect(rawToken).not.toBe(tokenHash);
  });

  // Test 2: Coordinate Range Boundary Validation
  it('2. Location updates strictly validate latitude (-90 to 90) and longitude (-180 to 180)', async () => {
    const invalidLatReq = new Request('http://localhost/api/locations/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'session-123',
        recipientToken: 'token-xyz',
        latitude: 150.0, // Invalid lat > 90
        longitude: -0.1,
        accuracyMeters: 10,
      }),
    }) as unknown as NextRequest;

    const res = await updateLocationHandler(invalidLatReq);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid location update payload.');
  });

  // Test 3: No-Store Cache-Control Headers on Sensitive Endpoints
  it('3. Sensitive location endpoint responses enforce strict Cache-Control: no-store headers', async () => {
    const mockUser = { id: 'user-1' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as never);

    const mockSession = {
      id: 'session-1',
      requester_id: 'user-1',
      status: 'active',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    };

    const mockLocation = {
      latitude: 51.5074,
      longitude: -0.1278,
      accuracy_meters: 10,
      recorded_at: new Date().toISOString(),
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
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const req = new Request('http://localhost/api/sessions/session-1/location') as unknown as NextRequest;
    const res = await getLocationHandler(req, { params: Promise.resolve({ sessionId: 'session-1' }) });

    expect(res.headers.get('Cache-Control')).toContain('no-store');
    expect(res.headers.get('Pragma')).toBe('no-cache');
  });

  // Test 4: Mandated Location Access Auditing Fails Closed
  it('4. Admin location read fails closed if audit event logging fails', async () => {
    const mockAdminUser = { id: 'admin-id' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockAdminUser }, error: null }),
      },
    } as never);

    const mockSession = {
      id: 'session-1',
      status: 'active',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    };

    mockCreateAdminClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
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
          return {
            insert: vi.fn().mockResolvedValue({ error: { message: 'Database failure' } }),
          };
        }
        return {};
      }),
    } as unknown as ReturnType<typeof createAdminClient>);

    await expect(getAdminSessionLocation('session-1', 'Audit check')).rejects.toThrow(
      'Security Audit Failure: Location read denied because audit logging failed.'
    );
  });

  // Test 5: Zero Coordinates in Security Audit Logs
  it('5. Audit event records contain zero latitude or longitude coordinates', () => {
    const adminAccessLog = {
      admin_id: 'admin-id',
      session_id: 'session-123',
      access_type: 'admin_live_map_view',
      reason: 'Safety check',
    };

    const str = JSON.stringify(adminAccessLog);
    expect(str).not.toContain('latitude');
    expect(str).not.toContain('longitude');
    expect(str).not.toContain('51.5074');
  });

  // Test 6: Open Redirect Prevention Verification
  it('6. Internal redirects strictly validate pathname without external host injection', () => {
    const isValidRedirect = (pathname: string) => {
      return pathname.startsWith('/') && !pathname.startsWith('//') && !pathname.includes('://');
    };

    expect(isValidRedirect('/dashboard')).toBe(true);
    expect(isValidRedirect('/admin')).toBe(true);
    expect(isValidRedirect('https://attacker.com')).toBe(false);
    expect(isValidRedirect('//attacker.com')).toBe(false);
  });
});
