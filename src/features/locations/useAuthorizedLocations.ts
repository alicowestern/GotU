'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export type SessionLocationData = {
  sessionId: string;
  status: 'active' | 'stopped' | 'expired' | 'stale';
  expiresAt: string | null;
  sharingDurationMinutes: number | null;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  recordedAt: string | null;
  updatedAt: string | null;
  isStale: boolean;
  lastFetchedAt: string;
};

export type RealtimeConnectionStatus = 'connected' | 'reconnecting' | 'offline' | 'idle';

export const STALE_THRESHOLD_MS = 60000; // 60 seconds

export function useAuthorizedLocations(sessionIds: string[]) {
  const [locationsMap, setLocationsMap] = useState<Record<string, SessionLocationData>>({});
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const channelsRef = useRef<Record<string, ReturnType<ReturnType<typeof createClient>['channel']>>>({});

  // Fetch location for a specific session from secure API endpoint
  const fetchSessionLocation = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/location`, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (response.status === 403 || response.status === 410) {
        // Revoked or expired
        setLocationsMap((prev) => {
          const next = { ...prev };
          delete next[sessionId];
          return next;
        });
        return null;
      }

      if (response.ok) {
        const data = await response.json();
        const loc = data.location;
        const now = Date.now();
        const recordedTime = loc?.recordedAt ? new Date(loc.recordedAt).getTime() : 0;
        const isStale = loc ? now - recordedTime > STALE_THRESHOLD_MS : false;

        const sessionData: SessionLocationData = {
          sessionId,
          status: isStale ? 'stale' : data.session.status,
          expiresAt: data.session.expiresAt,
          sharingDurationMinutes: data.session.sharingDurationMinutes,
          latitude: loc ? loc.latitude : null,
          longitude: loc ? loc.longitude : null,
          accuracyMeters: loc ? loc.accuracyMeters : null,
          recordedAt: loc ? loc.recordedAt : null,
          updatedAt: loc ? loc.updatedAt : null,
          isStale,
          lastFetchedAt: new Date().toISOString(),
        };

        setLocationsMap((prev) => ({
          ...prev,
          [sessionId]: sessionData,
        }));

        return sessionData;
      }
    } catch (err) {
      console.error(`Error fetching location for session ${sessionId}:`, err);
    }
    return null;
  }, []);

  // Fetch all initial session locations
  const refreshAllSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    for (const sid of sessionIds) {
      await fetchSessionLocation(sid);
    }
    setLoading(false);
  }, [sessionIds, fetchSessionLocation]);

  // Periodic stale check timer (updates isStale flag dynamically)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setLocationsMap((prev) => {
        let updated = false;
        const next = { ...prev };
        for (const sid in next) {
          const item = next[sid];
          if (item.recordedAt) {
            const recordedTime = new Date(item.recordedAt).getTime();
            const shouldBeStale = now - recordedTime > STALE_THRESHOLD_MS;
            if (item.isStale !== shouldBeStale) {
              updated = true;
              next[sid] = {
                ...item,
                isStale: shouldBeStale,
                status: shouldBeStale ? 'stale' : item.status === 'stale' ? 'active' : item.status,
              };
            }
          }
        }
        return updated ? next : prev;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Realtime Subscriptions with Bounded Backoff
  useEffect(() => {
    if (!sessionIds || sessionIds.length === 0) {
      return;
    }

    const supabase = createClient();

    const setupChannels = () => {
      sessionIds.forEach((sid) => {
        const channelName = `session_events:${sid}`;
        if (channelsRef.current[sid]) return;

        const channel = supabase.channel(channelName);
        channel
          .on('broadcast', { event: 'session_event' }, (payload: { payload?: { type?: string } }) => {
            const eventType = payload.payload?.type;

            if (eventType === 'LOCATION_UPDATED') {
              fetchSessionLocation(sid);
            } else if (eventType === 'SESSION_STOPPED' || eventType === 'SESSION_EXPIRED') {
              // Immediately remove from client state
              setLocationsMap((prev) => {
                const next = { ...prev };
                delete next[sid];
                return next;
              });
            } else if (eventType === 'SESSION_STARTED') {
              fetchSessionLocation(sid);
            }
          })
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              setConnectionStatus('connected');
              retryCountRef.current = 0;
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              setConnectionStatus('reconnecting');
              // Schedule bounded backoff retry
              if (!retryTimeoutRef.current) {
                const backoffMs = Math.min(1000 * Math.pow(2, retryCountRef.current), 16000);
                retryCountRef.current += 1;
                retryTimeoutRef.current = setTimeout(() => {
                  retryTimeoutRef.current = null;
                  refreshAllSessions();
                }, backoffMs);
              }
            }
          });

        channelsRef.current[sid] = channel;
      });
    };

    setupChannels();
    Promise.resolve().then(() => {
      refreshAllSessions();
    });

    // Cleanup channels on unmount or sessionIds change
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      for (const sid in channelsRef.current) {
        supabase.removeChannel(channelsRef.current[sid]);
      }
      channelsRef.current = {};
    };
  }, [sessionIds, refreshAllSessions, fetchSessionLocation]);

  return {
    locationsMap,
    connectionStatus,
    loading,
    error,
    refreshAllSessions,
    fetchSessionLocation,
  };
}
