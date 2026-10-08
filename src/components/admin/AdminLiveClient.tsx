'use client';

import React, { useState } from 'react';
import { AdminSessionSummary } from '@/features/admin/services/adminService';
import { getAdminLocationAction } from '@/features/admin/actions';
import { SessionLocationData } from '@/features/locations/useAuthorizedLocations';
import LiveMapWrapper from '@/components/maps/LiveMapWrapper';
import { Button } from '@/components/ui/button';

interface AdminLiveClientProps {
  initialSessions: AdminSessionSummary[];
}

export default function AdminLiveClient({ initialSessions }: AdminLiveClientProps) {
  const activeSessions = initialSessions.filter((s) => s.status === 'active');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    activeSessions.length > 0 ? activeSessions[0].id : null
  );
  const [auditReason, setAuditReason] = useState('Admin Live Map Oversight');
  const [auditedLocations, setAuditedLocations] = useState<Record<string, SessionLocationData>>({});
  const [loadingLoc, setLoadingLoc] = useState<Record<string, boolean>>({});
  const [auditError, setAuditError] = useState<string | null>(null);

  const handleFetchAuditedLocation = async (sessionId: string) => {
    if (!auditReason.trim()) {
      setAuditError('An audit reason is required before inspecting live coordinates.');
      return;
    }

    setLoadingLoc((prev) => ({ ...prev, [sessionId]: true }));
    setAuditError(null);

    const res = await getAdminLocationAction(sessionId, auditReason);
    setLoadingLoc((prev) => ({ ...prev, [sessionId]: false }));

    if (res.error) {
      setAuditError(res.error);
    } else if (res.location) {
      const loc = res.location;
      setAuditedLocations((prev) => ({
        ...prev,
        [sessionId]: {
          sessionId,
          status: 'active',
          expiresAt: null,
          sharingDurationMinutes: null,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracyMeters: loc.accuracy_meters,
          recordedAt: loc.recorded_at,
          updatedAt: loc.updated_at || null,
          isStale: false,
          lastFetchedAt: new Date().toISOString(),
        },
      }));
    }
  };

  // Convert audited locations into map marker objects for LiveMapWrapper
  const mapMarkers = activeSessions.map((session) => {
    const loc = auditedLocations[session.id] || null;
    return {
      session: {
        id: session.id,
        invitation_id: session.invitation_id,
        requester_id: session.requester_id,
        status: session.status,
        sharing_duration_minutes: session.sharing_duration_minutes,
        consent_granted_at: session.consent_granted_at,
        started_at: session.started_at,
        expires_at: session.expires_at,
        stopped_at: session.stopped_at,
        created_at: session.created_at,
        recipient_label: session.recipient_label,
        purpose: session.purpose,
      },
      location: loc,
    };
  });

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] min-h-[500px] overflow-hidden bg-background">
      <header className="px-4 py-3 border-b bg-card flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Super Admin Live Map</h1>
          <p className="text-xs text-muted-foreground">
            Audited live inspection of active consented recipient locations.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label className="font-semibold text-muted-foreground">Audit Reason:</label>
          <input
            type="text"
            value={auditReason}
            onChange={(e) => setAuditReason(e.target.value)}
            placeholder="Operational audit reason..."
            className="px-2.5 py-1 rounded border text-xs bg-background w-56"
          />
        </div>
      </header>

      {auditError && (
        <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-medium">
          {auditError}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Active Sessions */}
        <aside className="w-80 border-r bg-card flex flex-col overflow-y-auto">
          <div className="p-3 border-b bg-muted/20 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Active Consented Sessions ({activeSessions.length})
          </div>

          <div className="divide-y flex-1 overflow-y-auto">
            {activeSessions.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No active consented sessions currently online.
              </div>
            ) : (
              activeSessions.map((session) => {
                const isSelected = selectedSessionId === session.id;
                const isAudited = Boolean(auditedLocations[session.id]);

                return (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`p-3.5 space-y-2 cursor-pointer transition-all border-l-4 ${
                      isSelected ? 'bg-primary/10 border-l-primary' : 'border-l-transparent hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-xs text-foreground">
                        {session.recipient_label || 'Recipient'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 uppercase">
                        Active
                      </span>
                    </div>

                    <div className="text-[11px] text-muted-foreground">
                      Requester: <span className="text-foreground font-medium">{session.requester_name}</span>
                    </div>

                    <div className="flex items-center justify-between border-t pt-2 text-[11px]">
                      {isAudited ? (
                        <span className="text-emerald-600 font-semibold text-[10px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Location Audited
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">Uninspected</span>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loadingLoc[session.id]}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFetchAuditedLocation(session.id);
                        }}
                        className="h-6 text-[10px] px-2"
                      >
                        {loadingLoc[session.id] ? 'Auditing...' : 'Inspect Location'}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Center: Live Map */}
        <main className="flex-1 relative h-full">
          <LiveMapWrapper
            markers={mapMarkers}
            selectedSessionId={selectedSessionId}
            onSelectSession={setSelectedSessionId}
          />
        </main>
      </div>
    </div>
  );
}
