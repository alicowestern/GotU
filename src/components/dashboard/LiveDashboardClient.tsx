'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { AuthorizedSessionSummary } from '@/features/sessions/actions';
import { useAuthorizedLocations } from '@/features/locations/useAuthorizedLocations';
import LiveMapWrapper from '@/components/maps/LiveMapWrapper';
import { Button } from '@/components/ui/button';

interface LiveDashboardClientProps {
  initialSessions: AuthorizedSessionSummary[];
}

export default function LiveDashboardClient({ initialSessions }: LiveDashboardClientProps) {
  const [sessions] = useState<AuthorizedSessionSummary[]>(initialSessions);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    initialSessions.length > 0 ? initialSessions[0].id : null
  );
  const [centerOverride, setCenterOverride] = useState<[number, number] | null>(null);
  const [mobileTab, setMobileTab] = useState<'map' | 'sessions' | 'details'>('map');
  const [approxAddresses, setApproxAddresses] = useState<Record<string, string>>({});
  const [loadingAddress, setLoadingAddress] = useState<Record<string, boolean>>({});

  // Filter session IDs for realtime hook (active/pending sessions)
  const trackedSessionIds = useMemo(() => {
    return sessions
      .filter((s) => s.status === 'active' || s.status === 'pending')
      .map((s) => s.id);
  }, [sessions]);

  // Hook for secure realtime location sync
  const { locationsMap, connectionStatus, loading, refreshAllSessions } = useAuthorizedLocations(trackedSessionIds);

  // Combine session metadata with current live location
  const markerItems = useMemo(() => {
    return sessions.map((session) => {
      const locationData = locationsMap[session.id] || null;
      return {
        session,
        location: locationData,
      };
    });
  }, [sessions, locationsMap]);

  // Selected session details
  const selectedItem = useMemo(() => {
    if (!selectedSessionId) return null;
    return markerItems.find((item) => item.session.id === selectedSessionId) || null;
  }, [selectedSessionId, markerItems]);

  // Handle center on selected recipient
  const handleSelectSession = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
    const item = locationsMap[sessionId];
    if (item && typeof item.latitude === 'number' && typeof item.longitude === 'number') {
      setCenterOverride([item.latitude, item.longitude]);
    }
  }, [locationsMap]);

  // Fit to all active markers
  const handleFitAll = useCallback(() => {
    setCenterOverride(null);
    setSelectedSessionId(null);
  }, []);

  // Fetch reverse geocode address server-side
  const handleFetchAddress = async (sessionId: string, lat: number, lng: number) => {
    setLoadingAddress((prev) => ({ ...prev, [sessionId]: true }));
    try {
      const res = await fetch(`/api/geocoding/reverse?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      if (data.success && data.address) {
        setApproxAddresses((prev) => ({ ...prev, [sessionId]: data.address }));
      } else {
        setApproxAddresses((prev) => ({ ...prev, [sessionId]: 'Approximate address unavailable' }));
      }
    } catch {
      setApproxAddresses((prev) => ({ ...prev, [sessionId]: 'Approximate address unavailable' }));
    } finally {
      setLoadingAddress((prev) => ({ ...prev, [sessionId]: false }));
    }
  };

  // Remaining duration calculation
  const getRemainingTimeText = useCallback((expiresAt: string | null) => {
    if (!expiresAt) return 'No limit';
    const exp = new Date(expiresAt).getTime();
    const diff = exp - Date.now();
    if (diff <= 0) return 'Expired';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m remaining`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m remaining`;
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] min-h-[500px] overflow-hidden bg-background">
      {/* Top Controls Bar */}
      <header className="px-4 py-3 border-b bg-card flex items-center justify-between gap-4 flex-wrap z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight">Live Location Map</h1>

          {/* Connection Badge */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted border">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : connectionStatus === 'reconnecting'
                  ? 'bg-amber-500 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span className="capitalize">
              {connectionStatus === 'connected'
                ? 'Realtime Live'
                : connectionStatus === 'reconnecting'
                ? 'Reconnecting...'
                : 'Offline'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFitAll}
            className="text-xs h-8 min-h-[44px] md:min-h-[32px]"
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Reset View
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refreshAllSessions()}
            disabled={loading}
            className="text-xs h-8 min-h-[44px] md:min-h-[32px]"
          >
            <svg className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
      </header>

      {/* Mobile Tab Toggle Bar (Visible on small screens) */}
      <div className="md:hidden flex border-b bg-muted/30">
        <button
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
            mobileTab === 'map' ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground'
          }`}
        >
          Map View
        </button>
        <button
          onClick={() => setMobileTab('sessions')}
          className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
            mobileTab === 'sessions' ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground'
          }`}
        >
          Recipients ({sessions.length})
        </button>
        <button
          onClick={() => setMobileTab('details')}
          className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
            mobileTab === 'details' ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground'
          }`}
        >
          Details
        </button>
      </div>

      {/* Dashboard Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Authorized Sharing Sessions List */}
        <aside
          className={`w-full md:w-80 border-r bg-card flex-col overflow-y-auto ${
            mobileTab === 'sessions' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <div className="p-3 border-b bg-muted/20 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Authorized Sessions ({sessions.length})
            </h2>
          </div>

          <div className="divide-y flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm space-y-2">
                <svg className="w-10 h-10 mx-auto text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="font-medium">No Active Sessions</p>
                <p className="text-xs text-muted-foreground">
                  Send an invitation from your dashboard to start tracking live location.
                </p>
              </div>
            ) : (
              sessions.map((session) => {
                const locationData = locationsMap[session.id];
                const isSelected = selectedSessionId === session.id;

                // Determine display status
                let displayStatus: 'ACTIVE' | 'STALE' | 'DISCONNECTED' | 'STOPPED' | 'EXPIRED' = 'ACTIVE';

                if (session.status === 'stopped') {
                  displayStatus = 'STOPPED';
                } else if (session.status === 'expired') {
                  displayStatus = 'EXPIRED';
                } else if (connectionStatus === 'offline') {
                  displayStatus = 'DISCONNECTED';
                } else if (locationData?.isStale || locationData?.status === 'stale') {
                  displayStatus = 'STALE';
                } else if (session.status === 'active' && !locationData) {
                  displayStatus = 'DISCONNECTED';
                }

                const badgeColorMap = {
                  ACTIVE: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
                  STALE: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
                  DISCONNECTED: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30',
                  STOPPED: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
                  EXPIRED: 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30',
                };

                return (
                  <button
                    key={session.id}
                    onClick={() => {
                      handleSelectSession(session.id);
                      if (window.innerWidth < 768) {
                        setMobileTab('map');
                      }
                    }}
                    className={`w-full text-left p-3.5 transition-all hover:bg-muted/50 border-l-4 min-h-[56px] ${
                      isSelected
                        ? 'bg-primary/10 border-l-primary font-medium'
                        : 'border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-semibold text-sm truncate text-foreground">
                        {session.recipient_label || 'Anonymous Recipient'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${badgeColorMap[displayStatus]}`}
                      >
                        {displayStatus}
                      </span>
                    </div>

                    {session.purpose && (
                      <p className="text-xs text-muted-foreground truncate mb-1.5">
                        {session.purpose}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 border-t pt-1.5 border-border/40">
                      <div>
                        {locationData?.recordedAt
                          ? `Updated ${new Date(locationData.recordedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}`
                          : 'No coordinates'}
                      </div>
                      <div className="font-medium text-foreground/80">
                        {getRemainingTimeText(session.expires_at)}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Center: Main Interactive Map */}
        <main
          className={`flex-1 relative h-full ${
            mobileTab === 'map' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <LiveMapWrapper
            markers={markerItems}
            selectedSessionId={selectedSessionId}
            onSelectSession={handleSelectSession}
            centerOverride={centerOverride}
          />
        </main>

        {/* Right / Selected Recipient Details Panel */}
        <aside
          className={`w-full md:w-80 border-l bg-card flex-col overflow-y-auto ${
            mobileTab === 'details' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="p-3 border-b bg-muted/20 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Recipient Details
            </h2>
          </div>

          {selectedItem ? (
            <div className="p-4 space-y-4">
              {/* Recipient Header */}
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {selectedItem.session.recipient_label || 'Anonymous Recipient'}
                </h3>
                {selectedItem.session.purpose && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Purpose: <span className="text-foreground">{selectedItem.session.purpose}</span>
                  </p>
                )}
              </div>

              {/* Status Banner */}
              <div
                className={`p-3 rounded-lg border text-xs space-y-1 ${
                  selectedItem.session.status === 'stopped'
                    ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300'
                    : selectedItem.session.status === 'expired'
                    ? 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300'
                    : selectedItem.location?.isStale
                    ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>
                    {selectedItem.session.status === 'stopped'
                      ? 'Sharing Stopped'
                      : selectedItem.session.status === 'expired'
                      ? 'Session Expired'
                      : selectedItem.location?.isStale
                      ? 'Location Stale (>60s)'
                      : 'Live Location Active'}
                  </span>
                </div>
                <p className="text-[11px] opacity-90">
                  {selectedItem.session.status === 'stopped'
                    ? 'The recipient has stopped location sharing. Coordinates have been cleared.'
                    : selectedItem.session.status === 'expired'
                    ? 'The authorized sharing duration has ended.'
                    : selectedItem.location?.isStale
                    ? 'No new GPS fix received in the last 60 seconds. Position is de-emphasized.'
                    : 'Receiving live GPS location updates over encrypted realtime channel.'}
                </p>
              </div>

              {/* GPS Coordinates & Accuracy (Only if active & coordinates available) */}
              {selectedItem.location &&
              typeof selectedItem.location.latitude === 'number' &&
              typeof selectedItem.location.longitude === 'number' &&
              selectedItem.session.status === 'active' ? (
                <div className="space-y-3 bg-muted/30 p-3 rounded-lg border">
                  <div className="text-xs font-semibold text-foreground border-b pb-1">
                    Current Coordinates
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">LATITUDE</span>
                      <span className="font-mono font-medium">{selectedItem.location.latitude.toFixed(6)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">LONGITUDE</span>
                      <span className="font-mono font-medium">{selectedItem.location.longitude.toFixed(6)}</span>
                    </div>
                  </div>

                  <div className="text-xs border-t pt-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reported Accuracy:</span>
                      <span className="font-semibold text-foreground">
                        ±{Math.round(selectedItem.location.accuracyMeters || 0)} meters
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Last update:</span>
                      <span>
                        {selectedItem.location.recordedAt
                          ? new Date(selectedItem.location.recordedAt).toLocaleTimeString()
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Reverse Geocoding Address Lookup */}
                  <div className="border-t pt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Approximate Address</span>
                      {!approxAddresses[selectedItem.session.id] && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={loadingAddress[selectedItem.session.id]}
                          onClick={() =>
                            handleFetchAddress(
                              selectedItem.session.id,
                              selectedItem.location!.latitude!,
                              selectedItem.location!.longitude!
                            )
                          }
                          className="h-6 text-[10px] px-2"
                        >
                          {loadingAddress[selectedItem.session.id] ? 'Loading...' : 'Lookup Address'}
                        </Button>
                      )}
                    </div>
                    {approxAddresses[selectedItem.session.id] && (
                      <p className="text-xs bg-background p-2 rounded border text-muted-foreground font-mono leading-relaxed">
                        {approxAddresses[selectedItem.session.id]}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center bg-muted/20 border rounded-lg text-muted-foreground text-xs">
                  No live location coordinates available for this session.
                </div>
              )}

              {/* Session Metadata */}
              <div className="space-y-2 text-xs border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started:</span>
                  <span className="text-foreground">
                    {selectedItem.session.started_at
                      ? new Date(selectedItem.session.started_at).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : 'Not started'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expires:</span>
                  <span className="text-foreground">
                    {selectedItem.session.expires_at
                      ? new Date(selectedItem.session.expires_at).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration Limit:</span>
                  <span className="text-foreground">
                    {selectedItem.session.sharing_duration_minutes
                      ? `${selectedItem.session.sharing_duration_minutes} minutes`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Accuracy Disclaimer */}
              <div className="p-3 bg-muted/40 rounded-lg text-[11px] text-muted-foreground leading-relaxed border">
                <p className="font-semibold text-foreground/80 mb-1">GPS Accuracy Disclaimer</p>
                GPS accuracy is an estimate provided by the recipient&apos;s device and browser. Environmental conditions, buildings, and hardware limits affect accuracy.
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-muted-foreground text-sm">
              Select a recipient session from the list or map to inspect details.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
