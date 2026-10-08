'use client';

import React, { useState, useMemo } from 'react';
import { AdminUserSummary } from '@/features/admin/services/adminService';
import { suspendUserAction, reactivateUserAction } from '@/features/admin/actions';
import { Button } from '@/components/ui/button';

interface AdminUsersClientProps {
  initialUsers: AdminUserSummary[];
}

export default function AdminUsersClient({ initialUsers }: AdminUsersClientProps) {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return initialUsers;
    return initialUsers.filter(
      (u) =>
        (u.full_name && u.full_name.toLowerCase().includes(query)) ||
        u.id.toLowerCase().includes(query)
    );
  }, [initialUsers, search]);

  const handleSuspendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (selectedUser.isAdmin) {
      setFeedback({ type: 'error', message: 'Cannot suspend the Super Admin account.' });
      return;
    }

    if (!suspendReason.trim()) {
      setFeedback({ type: 'error', message: 'Please provide a reason for suspension.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const res = await suspendUserAction(selectedUser.id, suspendReason);
    setIsSubmitting(false);

    if ('error' in res && res.error) {
      setFeedback({ type: 'error', message: res.error });
    } else {
      setFeedback({ type: 'success', message: `User ${selectedUser.full_name || selectedUser.id} suspended successfully.` });
      setSelectedUser(null);
      setSuspendReason('');
    }
  };

  const handleReactivate = async (user: AdminUserSummary) => {
    setIsSubmitting(true);
    setFeedback(null);

    const res = await reactivateUserAction(user.id);
    setIsSubmitting(false);

    if ('error' in res && res.error) {
      setFeedback({ type: 'error', message: res.error });
    } else {
      setFeedback({ type: 'success', message: `User ${user.full_name || user.id} reactivated successfully.` });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Overview of registered accounts, status controls, and account suspension safeguards.
          </p>
        </div>

        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-md border text-sm bg-background text-foreground"
          />
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-md text-xs font-medium border ${
            feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* User Table */}
      <div className="border rounded-lg bg-card overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/30 border-b text-muted-foreground font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-3.5">User / ID</th>
              <th className="p-3.5">Role</th>
              <th className="p-3.5">Account Status</th>
              <th className="p-3.5">Active Sessions</th>
              <th className="p-3.5">Registered Date</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No users match the search criteria.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3.5">
                    <div className="font-semibold text-foreground">
                      {user.full_name || 'Anonymous User'}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">{user.id}</div>
                  </td>
                  <td className="p-3.5">
                    {user.isAdmin ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 uppercase">
                        Super Admin
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-muted-foreground">Registered User</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                        user.status === 'suspended'
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="p-3.5 font-medium">{user.activeSessionCount || 0}</td>
                  <td className="p-3.5 text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString([], {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="p-3.5 text-right space-x-2">
                    {user.isAdmin ? (
                      <span className="text-[11px] text-muted-foreground italic">Protected</span>
                    ) : user.status === 'active' ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => {
                          setSelectedUser(user);
                          setSuspendReason('');
                        }}
                        className="h-7 text-xs px-2.5 min-h-[44px] md:min-h-[28px]"
                      >
                        Suspend User
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => handleReactivate(user)}
                        className="h-7 text-xs px-2.5 min-h-[44px] md:min-h-[28px]"
                      >
                        Reactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Suspend Confirmation Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-destructive">Suspend User Account</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Suspending <span className="font-semibold text-foreground">{selectedUser.full_name || selectedUser.id}</span> will:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>Block all protected application operations.</li>
              <li>Prevent creation of new location invitations.</li>
              <li>Revoke all pending invitations and terminate active sharing sessions.</li>
              <li>Delete all current location coordinates.</li>
            </ul>

            <form onSubmit={handleSuspendSubmit} className="space-y-4 border-t pt-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  Reason for Suspension (Required)
                </label>
                <textarea
                  required
                  rows={3}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="State the operational or security reason..."
                  className="w-full p-2 text-xs rounded border bg-background"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedUser(null)}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={isSubmitting} className="text-xs">
                  {isSubmitting ? 'Suspending...' : 'Confirm Suspension'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
