'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type GeolocationState = {
  isTracking: boolean;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  lastUpdated: string | null;
  gpsStatus: 'idle' | 'requesting' | 'active' | 'permission_denied' | 'unavailable' | 'timeout' | 'unsupported';
  errorMessage: string | null;
  connectionStatus: 'connected' | 'offline' | 'error';
  isServerUpdatePending: boolean;
};

interface UseGeolocationSharingOptions {
  sessionId: string | null;
  recipientToken: string | null;
  onSessionExpired?: () => void;
}

export function useGeolocationSharing({
  sessionId,
  recipientToken,
  onSessionExpired,
}: UseGeolocationSharingOptions) {
  const [state, setState] = useState<GeolocationState>({
    isTracking: false,
    latitude: null,
    longitude: null,
    accuracy: null,
    lastUpdated: null,
    gpsStatus: 'idle',
    errorMessage: null,
    connectionStatus: 'connected',
    isServerUpdatePending: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const isOnlineRef = useRef<boolean>(true);

  // Monitor online / offline status
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      setState((prev) => ({ ...prev, connectionStatus: 'connected' }));
    };
    const handleOffline = () => {
      isOnlineRef.current = false;
      setState((prev) => ({ ...prev, connectionStatus: 'offline' }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const onSessionExpiredRef = useRef(onSessionExpired);
  useEffect(() => {
    onSessionExpiredRef.current = onSessionExpired;
  }, [onSessionExpired]);

  // Send update to server endpoint
  const sendLocationUpdate = useCallback(
    async (position: GeolocationPosition) => {
      if (!sessionId || !recipientToken) return;

      const { latitude, longitude, accuracy } = position.coords;
      const timestamp = position.timestamp;

      setState((prev) => ({
        ...prev,
        latitude,
        longitude,
        accuracy,
        isServerUpdatePending: true,
      }));

      if (!isOnlineRef.current) {
        setState((prev) => ({
          ...prev,
          connectionStatus: 'offline',
          isServerUpdatePending: false,
        }));
        return;
      }

      try {
        const response = await fetch('/api/locations/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            recipientToken,
            latitude,
            longitude,
            accuracy,
            timestamp,
          }),
        });

        if (response.status === 410) {
          // Session expired on server
          if (watchIdRef.current !== null && typeof window !== 'undefined' && 'geolocation' in navigator) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          setState((prev) => ({ ...prev, isTracking: false, gpsStatus: 'idle' }));
          if (onSessionExpiredRef.current) onSessionExpiredRef.current();
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setState((prev) => ({
            ...prev,
            lastUpdated: data.recordedAt || new Date().toISOString(),
            connectionStatus: 'connected',
            isServerUpdatePending: false,
            errorMessage: null,
          }));
        } else if (response.status === 429) {
          // Rate limited, keep tracking
          setState((prev) => ({ ...prev, isServerUpdatePending: false }));
        } else {
          const errorData = await response.json().catch(() => ({}));
          setState((prev) => ({
            ...prev,
            connectionStatus: 'error',
            isServerUpdatePending: false,
            errorMessage: errorData.error || 'Server error updating location',
          }));
        }
      } catch {
        setState((prev) => ({
          ...prev,
          connectionStatus: 'offline',
          isServerUpdatePending: false,
        }));
      }
    },
    [sessionId, recipientToken]
  );

  // Stop watchPosition
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isTracking: false,
      gpsStatus: 'idle',
    }));
  }, []);

  // Start watchPosition
  const startTracking = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setState((prev) => ({
        ...prev,
        gpsStatus: 'unsupported',
        errorMessage: 'Geolocation is not supported by your browser.',
      }));
      return false;
    }

    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setState((prev) => ({
        ...prev,
        gpsStatus: 'unsupported',
        errorMessage: 'Location sharing requires a secure HTTPS connection.',
      }));
      return false;
    }

    setState((prev) => ({
      ...prev,
      isTracking: true,
      gpsStatus: 'requesting',
      errorMessage: null,
    }));

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000,
    };

    const handleSuccess = (position: GeolocationPosition) => {
      setState((prev) => ({
        ...prev,
        gpsStatus: 'active',
        errorMessage: null,
      }));
      sendLocationUpdate(position);
    };

    const handleError = (error: GeolocationPositionError) => {
      let status: GeolocationState['gpsStatus'] = 'unavailable';
      let msg = 'Failed to retrieve location.';

      switch (error.code) {
        case error.PERMISSION_DENIED:
          status = 'permission_denied';
          msg = 'Location permission was denied. Please allow location access in your browser settings to share your position.';
          break;
        case error.POSITION_UNAVAILABLE:
          status = 'unavailable';
          msg = 'Location information is currently unavailable. Ensure your GPS is enabled.';
          break;
        case error.TIMEOUT:
          status = 'timeout';
          msg = 'Location request timed out. Retrying...';
          break;
      }

      setState((prev) => ({
        ...prev,
        gpsStatus: status,
        errorMessage: msg,
      }));
    };

    try {
      const id = navigator.geolocation.watchPosition(handleSuccess, handleError, options);
      watchIdRef.current = id;
      return true;
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Error initializing Geolocation watcher.';
      setState((prev) => ({
        ...prev,
        gpsStatus: 'unavailable',
        errorMessage: errorMsg,
      }));
      return false;
    }
  }, [sendLocationUpdate]);

  // Clear watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return {
    state,
    startTracking,
    stopTracking,
  };
}
