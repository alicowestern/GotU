'use client';

import React, { useState } from 'react';
import { SecurityAuditEventItem, AdminAccessEventItem } from '@/features/admin/services/adminService';

interface AdminSecurityClientProps {
  securityEvents: SecurityAuditEventItem[];
  accessEvents: AdminAccessEventItem[];
}

export default function AdminSecurityClient({ securityEvents, accessEvents }: AdminSecurityClientProps) {
  const [tab, setTab] = useState<'security' | 'access'>('security');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security & Audit Logs</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Append-only security audit trail, user suspensions, administrative terminations, and audited location views.
          </p>
        </div>

        {/* Log Type Filter Tabs */}
        <div className="flex border rounded-md p-1 bg-muted/20 text-xs">
          <button
            onClick={() => setTab('security')}
            className={`px-3 py-1.5 rounded font-semibold transition-colors ${
              tab === 'security' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Security Events ({securityEvents.length})
          </button>
          <button
            onClick={() => setTab('access')}
            className={`px-3 py-1.5 rounded font-semibold transition-colors ${
              tab === 'access' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Admin Location Access ({accessEvents.length})
          </button>
        </div>
      </div>

      {tab === 'security' ? (
        <div className="border rounded-lg bg-card overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30 border-b text-muted-foreground font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Event Type</th>
                <th className="p-3.5">Actor</th>
                <th className="p-3.5">Target Reference</th>
                <th className="p-3.5">Operational Details</th>
                <th className="p-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {securityEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    No security audit events recorded.
                  </td>
                </tr>
              ) : (
                securityEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5 font-semibold text-foreground uppercase tracking-wide">
                      {evt.event_type.replace(/_/g, ' ')}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                      {evt.actor_id ? `${evt.actor_id.slice(0, 8)}...` : 'System'}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-foreground">
                      {evt.target_id || 'N/A'}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-muted-foreground max-w-xs truncate">
                      {evt.details ? JSON.stringify(evt.details) : 'None'}
                    </td>
                    <td className="p-3.5 text-right text-muted-foreground whitespace-nowrap">
                      {new Date(evt.created_at).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border rounded-lg bg-card overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30 border-b text-muted-foreground font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Access Type</th>
                <th className="p-3.5">Admin ID</th>
                <th className="p-3.5">Session ID</th>
                <th className="p-3.5">Operational Reason</th>
                <th className="p-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {accessEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    No admin location access events recorded.
                  </td>
                </tr>
              ) : (
                accessEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5 font-semibold text-foreground uppercase tracking-wide">
                      {evt.access_type.replace(/_/g, ' ')}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                      {evt.admin_id ? `${evt.admin_id.slice(0, 8)}...` : 'N/A'}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-foreground">
                      {evt.session_id ? `${evt.session_id.slice(0, 8)}...` : 'N/A'}
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {evt.reason || 'No reason specified'}
                    </td>
                    <td className="p-3.5 text-right text-muted-foreground whitespace-nowrap">
                      {new Date(evt.accessed_at).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
