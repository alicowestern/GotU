'use client';

import React, { useState, useMemo } from 'react';
import { AdminSessionSummary } from '@/features/admin/services/adminService';
import { terminateSessionAction } from '@/features/admin/actions';
import { Button } from '@/components/ui/button';

interface AdminSessionsClientProps {
  initialSessions: AdminSessionSummary[];
}

export default function AdminSessionsClient({ initialSessions }: AdminSessionsClientProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'stopped' | 'expired'>('all');
  const [selectedSession, setSelectedSession] = useState<AdminSessionSummary | null>(null);
  const [terminateReason, setTerminateReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const filteredSessions = useMemo(() => {
    if (statusFilter === 'all') return initialSessions;
    return initialSessions.filter((s) => s.status === statusFilter);
  }, [initialSessions, statusFilter]);

  const handleTerminateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;

    if (!terminateReason.trim()) {
      setFeedback({ type: 'error', message: 'A reason is required to terminate a session.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const res = await terminateSessionAction(selectedSession.id, terminateReason);
    setIsSubmitting(false);

    if ('error' in res && res.error) {
      setFeedback({ type: 'error', message: res.error });
    } else {
      setFeedback({ type: 'success', message: `Session ${selectedSession.id.slice(0, 8)} terminated successfully.` });
      setSelectedSession(null);
      setTerminateReason('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Session Monitoring</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Oversight of location sharing sessions, lifecycle statuses, and administrative termination.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex border rounded-md p-1 bg-muted/20 text-xs">
          {(['all', 'active', 'stopped', 'expired'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded font-semibold capitalize transition-colors ${
                statusFilter === st ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {st}
            </button>
          ))}
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

      {/* Sessions Table */}
      <div className="border rounded-lg bg-card overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/30 border-b text-muted-foreground font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-3.5">Session ID</th>
              <th className="p-3.5">Requester</th>
              <th className="p-3.5">Recipient / Purpose</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Expires</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredSessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No sessions found matching status &quot;{statusFilter}&quot;.
                </td>
              </tr>
            ) : (
              filteredSessions.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3.5 font-mono font-medium text-foreground">{s.id.slice(0, 8)}...</td>
                  <td className="p-3.5">
                    <div className="font-semibold text-foreground">{s.requester_name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{s.requester_id.slice(0, 8)}...</div>
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-foreground">{s.recipient_label || 'Anonymous Recipient'}</div>
                    {s.purpose && <div className="text-muted-foreground italic text-[11px] truncate max-w-[200px]">&quot;{s.purpose}&quot;</div>}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                        s.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                          : s.status === 'stopped'
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                          : 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-muted-foreground">
                    {s.expires_at
                      ? new Date(s.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'N/A'}
                  </td>
                  <td className="p-3.5 text-right">
                    {s.status === 'active' ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => {
                          setSelectedSession(s);
                          setTerminateReason('');
                        }}
                        className="h-7 text-xs px-2.5 min-h-[44px] md:min-h-[28px]"
                      >
                        Terminate Session
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">Terminated</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Session Termination Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-destructive">Terminate Active Session</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Terminating session <span className="font-mono font-semibold text-foreground">{selectedSession.id}</span> for recipient <span className="font-semibold text-foreground">{selectedSession.recipient_label || 'Recipient'}</span> will:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>Revoke recipient session credentials immediately.</li>
              <li>Delete all current location coordinates.</li>
              <li>Block any future location updates or reads.</li>
              <li>Record the administrative termination event in audit logs.</li>
            </ul>

            <form onSubmit={handleTerminateSubmit} className="space-y-4 border-t pt-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  Reason for Termination (Required)
                </label>
                <textarea
                  required
                  rows={3}
                  value={terminateReason}
                  onChange={(e) => setTerminateReason(e.target.value)}
                  placeholder="State the safety, policy, or abuse prevention reason..."
                  className="w-full p-2 text-xs rounded border bg-background"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedSession(null)}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={isSubmitting} className="text-xs">
                  {isSubmitting ? 'Terminating...' : 'Confirm Termination'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
