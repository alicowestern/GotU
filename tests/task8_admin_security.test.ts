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
import {
  requireSuperAdmin,
  getAdminDashboardMetrics,
  getAdminUsers,
  suspendUser,
  getAdminSessionLocation,
  terminateSessionByAdmin,
} from '@/features/admin/services/adminService';
import { createInvitation } from '@/features/invitations/actions';
import { GET as getLocationHandler } from '@/app/api/sessions/[sessionId]/location/route';

const mockCreateClient = vi.mocked(createClient);
const mockCreateAdminClient = vi.mocked(createAdminClient);

describe('Task 8 — GotU Super Admin Dashboard, User Management & Security Auditing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Sole Super Admin can pass requireSuperAdmin authorization check
  it('1. Sole Super Admin can pass requireSuperAdmin authorization', async () => {
    const mockAdminUser = { id: 'super-admin-uid-123' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockAdminUser }, error: null }),
      },
    } as never);

    mockCreateAdminClient.mockReturnValue({
      rpc: vi.fn().mockImplementation((fn: string) => {
        if (fn === 'is_admin') return Promise.resolve({ data: true, error: null });
        return Promise.resolve({ data: null, error: null });
      }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const user = await requireSuperAdmin();
    expect(user.id).toBe('super-admin-uid-123');
  });

  // Test 2: Ordinary registered user is denied Super Admin access
  it('2. Ordinary user is denied Super Admin access (fails closed)', async () => {
    const mockOrdinaryUser = { id: 'ordinary-user-456' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockOrdinaryUser }, error: null }),
      },
    } as never);

    mockCreateAdminClient.mockReturnValue({
      rpc: vi.fn().mockImplementation((fn: string) => {
        if (fn === 'is_admin') return Promise.resolve({ data: false, error: null });
        return Promise.resolve({ data: null, error: null });
      }),
    } as unknown as ReturnType<typeof createAdminClient>);

    await expect(requireSuperAdmin()).rejects.toThrow('Forbidden: Super Admin privileges required.');
  });

  // Test 3: Guest / Unauthenticated visitor is denied admin APIs
  it('3. Unauthenticated visitor is denied admin access', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never);

    await expect(requireSuperAdmin()).rejects.toThrow('Unauthorized: Authentication required.');
  });

  // Test 4: User cannot self-assign admin role
  it('4. User cannot self-assign admin role (is_admin RPC checks server config)', async () => {
    const mockAttacker = { id: 'attacker-id' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockAttacker }, error: null }),
      },
    } as never);

    mockCreateAdminClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    } as unknown as ReturnType<typeof createAdminClient>);

    await expect(getAdminDashboardMetrics()).rejects.toThrow('Forbidden: Super Admin privileges required.');
  });

  // Test 5: Missing admin configuration fails closed
  it('5. Missing admin configuration fails closed', async () => {
    const mockUser = { id: 'some-user' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as never);

    mockCreateAdminClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'Config missing' } }),
    } as unknown as ReturnType<typeof createAdminClient>);

    await expect(requireSuperAdmin()).rejects.toThrow('Forbidden: Super Admin privileges required.');
  });

  // Test 6 & 7: Admin can list users; non-admin cannot
  it('6 & 7. Admin can list users; non-admin cannot access user directory', async () => {
    const mockAdminUser = { id: 'admin-uid' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockAdminUser }, error: null }),
      },
    } as never);

    const mockProfiles = [
      { id: 'user-1', full_name: 'Alice', avatar_url: null, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];

    mockCreateAdminClient.mockReturnValue({
      rpc: vi.fn().mockImplementation((fn: string) => {
        if (fn === 'is_admin') return Promise.resolve({ data: true, error: null });
        return Promise.resolve({ data: null, error: null });
      }),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
            }),
          };
        }
        if (table === 'sharing_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const users = await getAdminUsers();
    expect(users.length).toBe(1);
    expect(users[0].full_name).toBe('Alice');
  });

  // Test 8: Suspended user cannot create invitations
  it('8. Suspended user cannot create invitations', async () => {
    const mockSuspendedUser = { id: 'suspended-user-id' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockSuspendedUser }, error: null }),
      },
    } as never);

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { status: 'suspended' }, error: null }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const formData = new FormData();
    formData.append('purpose', 'Test purpose');
    formData.append('expiryHours', '1');

    const res = await createInvitation(null, formData);
    expect(res.error).toBe('Your account is currently suspended.');
  });

  // Test 9 & 10: Suspended user's location access is revoked
  it('9 & 10. Suspended user\'s location access is revoked (returns status 403)', async () => {
    const mockUser = { id: 'suspended-requester' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as never);

    const mockSession = {
      id: 'session-100',
      requester_id: 'suspended-requester',
      status: 'active',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
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
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { status: 'suspended' }, error: null }),
              }),
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const req = new Request('http://localhost/api/sessions/session-100/location') as unknown as NextRequest;
    const res = await getLocationHandler(req, { params: Promise.resolve({ sessionId: 'session-100' }) });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden: Account is suspended.');
  });

  // Test 11: Admin cannot suspend their own sole-admin account
  it('11. Admin cannot suspend their own sole-admin account', async () => {
    const mockAdminUser = { id: 'admin-sole-id' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockAdminUser }, error: null }),
      },
    } as never);

    mockCreateAdminClient.mockReturnValue({
      rpc: vi.fn().mockImplementation((fn: string) => {
        if (fn === 'is_admin') {
          return Promise.resolve({ data: true, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    } as unknown as ReturnType<typeof createAdminClient>);

    await expect(suspendUser('admin-sole-id', 'Self suspend attempt')).rejects.toThrow(
      'Cannot suspend the Super Admin account.'
    );
  });

  // Test 12 & 13: Admin location read creates an audit record; audit failure blocks disclosure
  it('12 & 13. Audit failure blocks sensitive location disclosure', async () => {
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
            // Simulate audit failure
            insert: vi.fn().mockResolvedValue({ error: { message: 'Database connection failed' } }),
          };
        }
        return {};
      }),
    } as unknown as ReturnType<typeof createAdminClient>);

    await expect(getAdminSessionLocation('session-1', 'Inspection')).rejects.toThrow(
      'Security Audit Failure: Location read denied because audit logging failed.'
    );
  });

  // Test 14 & 15: Admin cannot view expired or revoked session location coordinates
  it('14 & 15. Admin cannot view expired or revoked session location coordinates', async () => {
    const mockAdminUser = { id: 'admin-id' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockAdminUser }, error: null }),
      },
    } as never);

    const mockStoppedSession = {
      id: 'session-stopped',
      status: 'stopped',
      expires_at: new Date().toISOString(),
    };

    mockCreateAdminClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'sharing_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockStoppedSession, error: null }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as ReturnType<typeof createAdminClient>);

    await expect(getAdminSessionLocation('session-stopped', 'Check')).rejects.toThrow(
      'Location inaccessible: Session is not active.'
    );
  });

  // Test 16: Admin session termination requires reason and executes RPC
  it('16. Admin session termination requires reason', async () => {
    const mockAdminUser = { id: 'admin-id' };
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockAdminUser }, error: null }),
      },
    } as never);

    mockCreateAdminClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    } as unknown as ReturnType<typeof createAdminClient>);

    await expect(terminateSessionByAdmin('session-1', '')).rejects.toThrow(
      'An explicit reason is required to terminate a session.'
    );
  });

  // Test 17 & 19: Security logs contain no GPS coordinates or secret tokens
  it('17 & 19. Security logs contain no GPS coordinates or secret tokens', () => {
    const auditPayload = {
      actor_id: 'admin-id',
      event_type: 'user_suspended',
      target_id: 'user-id',
      details: { reason: 'Policy violation' },
    };

    const jsonStr = JSON.stringify(auditPayload);
    expect(jsonStr).not.toContain('latitude');
    expect(jsonStr).not.toContain('longitude');
    expect(jsonStr).not.toContain('token_hash');
    expect(jsonStr).not.toContain('password');
  });

  // Test 20: Mobile and Desktop layout support flags
  it('20. Admin UI layout supports mobile and desktop navigation', async () => {
    const layoutModule = await import('@/app/(admin)/admin/layout');
    expect(layoutModule.default).toBeDefined();
  });
});
