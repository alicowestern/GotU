import React from 'react';
import { getAdminDashboardMetrics } from '@/features/admin/services/adminService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default async function AdminOverviewPage() {
  const metrics = await getAdminDashboardMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Super Admin Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time security monitoring, system metrics, and consent oversight.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registered Users</CardTitle>
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">{metrics.activeUsers} active / {metrics.totalUsers - metrics.activeUsers} suspended</p>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Consented Sessions</CardTitle>
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.activeSessions}</div>
            <p className="text-xs text-muted-foreground mt-1">Live location tracking active</p>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingInvitations}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting recipient redemption</p>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed / Terminated</CardTitle>
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.expiredSessions + metrics.stoppedSessions}</div>
            <p className="text-xs text-muted-foreground mt-1">{metrics.expiredSessions} expired / {metrics.stoppedSessions} stopped</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation & Recent Events Table */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Audit Events Stream */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent Security Audit Stream</h2>
            <Link href="/admin/security" className="text-xs text-primary hover:underline font-medium">
              View All Logs &rarr;
            </Link>
          </div>

          <div className="border rounded-lg bg-card overflow-hidden">
            {metrics.recentEvents.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No security audit events logged yet.
              </div>
            ) : (
              <div className="divide-y text-xs">
                {metrics.recentEvents.map((evt) => (
                  <div key={evt.id} className="p-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-foreground uppercase tracking-wide">
                        {evt.event_type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-muted-foreground">
                        Target: <span className="font-mono">{evt.target_id || 'System'}</span>
                        {typeof evt.details?.reason === 'string' && ` — "${evt.details.reason}"`}
                      </div>
                    </div>
                    <div className="text-muted-foreground text-[11px] whitespace-nowrap">
                      {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Admin Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Admin Controls</h2>
          <div className="space-y-3">
            <Link href="/admin/users" className="block p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
              <div className="font-semibold text-sm">User Management</div>
              <p className="text-xs text-muted-foreground mt-1">
                View profiles, search accounts, suspend abusers or reactivate accounts.
              </p>
            </Link>

            <Link href="/admin/sessions" className="block p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
              <div className="font-semibold text-sm">Session Monitoring</div>
              <p className="text-xs text-muted-foreground mt-1">
                Monitor active location sharing sessions and administratively terminate sessions.
              </p>
            </Link>

            <Link href="/admin/live" className="block p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
              <div className="font-semibold text-sm">Admin Live Map</div>
              <p className="text-xs text-muted-foreground mt-1">
                Inspect active consented location markers with compulsory access auditing.
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
