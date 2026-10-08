'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PrivacyInfoDialog } from '@/components/PrivacyInfoDialog';
import { acceptAndRedeemInvitation, revokeRecipientSession, getRecipientSessionStatus } from '@/features/consent/actions';
import { useGeolocationSharing } from '@/hooks/useGeolocationSharing';
import { Shield, ShieldAlert, ShieldCheck, Clock, MapPin, AlertCircle, Signal, SignalZero, Radio, RefreshCw, XCircle } from 'lucide-react';

type Invitation = {
  id: string;
  purpose: string;
  personalMessage: string | null;
  requesterName: string;
  expiresAt: string;
  rawToken: string;
};

type ViewState = 'consent_form' | 'declined' | 'sharing_active' | 'sharing_stopped' | 'expired';

export default function RecipientConsentClient({ invitation }: { invitation: Invitation }) {
  // State
  const [selectedDuration, setSelectedDuration] = useState<15 | 30 | 60 | null>(null);
  const [viewState, setViewState] = useState<ViewState>('consent_form');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recipientToken, setRecipientToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  
  // Loading & Error handling
  const [isActivating, setIsActivating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [serverRevocationPending, setServerRevocationPending] = useState(false);

  // Hook for GPS sharing
  const handleSessionExpired = useCallback(() => {
    setViewState('expired');
  }, []);

  const { state: geoState, startTracking, stopTracking } = useGeolocationSharing({
    sessionId,
    recipientToken,
    onSessionExpired: handleSessionExpired,
  });

  // Check existing session on page load (e.g., after reload)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedSessionId = sessionStorage.getItem(`gotu_session_${invitation.id}`);
    const storedToken = sessionStorage.getItem(`gotu_token_${invitation.id}`);

    if (storedSessionId && storedToken) {
      getRecipientSessionStatus({ sessionId: storedSessionId, recipientToken: storedToken }).then((res) => {
        if (res && res.status === 'active' && !res.isExpired) {
          setSessionId(storedSessionId);
          setRecipientToken(storedToken);
          setExpiresAt(res.expiresAt || null);
          setViewState('sharing_active');
        } else if (res && (res.status === 'stopped' || res.status === 'expired')) {
          sessionStorage.removeItem(`gotu_session_${invitation.id}`);
          sessionStorage.removeItem(`gotu_token_${invitation.id}`);
          if (res.status === 'expired') setViewState('expired');
          else setViewState('sharing_stopped');
        }
      });
    }
  }, [invitation.id]);

  // Expiration countdown timer
  useEffect(() => {
    if (viewState !== 'sharing_active' || !expiresAt) return;

    const interval = setInterval(() => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        setRemainingSeconds(0);
        stopTracking();
        setViewState('expired');
        clearInterval(interval);
      } else {
        setRemainingSeconds(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [viewState, expiresAt, stopTracking]);

  // Online listener for pending server revocation retries
  useEffect(() => {
    if (!serverRevocationPending || !sessionId || !recipientToken) return;

    const retryRevoke = async () => {
      const res = await revokeRecipientSession({ sessionId, recipientToken });
      if (res.success) {
        setServerRevocationPending(false);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(`gotu_session_${invitation.id}`);
          sessionStorage.removeItem(`gotu_token_${invitation.id}`);
        }
      }
    };

    window.addEventListener('online', retryRevoke);
    return () => window.removeEventListener('online', retryRevoke);
  }, [serverRevocationPending, sessionId, recipientToken, invitation.id]);

  // Format countdown string
  const formatTimer = (seconds: number | null) => {
    if (seconds === null || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Step 5: Consent activation & GPS permission flow
  const handleStartSharing = async () => {
    if (!selectedDuration) return;

    setIsActivating(true);
    setPermissionError(null);

    // 1. Check Geolocation API availability
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setPermissionError('Geolocation API is not supported by your browser.');
      setIsActivating(false);
      return;
    }

    // 2. Explicitly test/request GPS permission before redeeming invitation
    navigator.geolocation.getCurrentPosition(
      async () => {
        // Permission granted! Redeem invitation on server atomically.
        const res = await acceptAndRedeemInvitation({
          rawToken: invitation.rawToken,
          durationMinutes: selectedDuration,
          consentNoticeVersion: 'v1.0',
        });

        if (res.error || !res.sessionId || !res.recipientToken) {
          setPermissionError(res.error || 'Failed to activate location sharing session.');
          setIsActivating(false);
          return;
        }

        // Save session credentials
        setSessionId(res.sessionId);
        setRecipientToken(res.recipientToken);
        setExpiresAt(res.expiresAt || null);

        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`gotu_session_${invitation.id}`, res.sessionId);
          sessionStorage.setItem(`gotu_token_${invitation.id}`, res.recipientToken);
        }

        setIsActivating(false);
        setViewState('sharing_active');
      },
      (err) => {
        setIsActivating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionError(
            'GPS Permission Denied. You must allow location access in your browser to share your position.'
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setPermissionError('GPS position unavailable. Please ensure location services are enabled on your device.');
        } else {
          setPermissionError('Location request timed out. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Start tracking when view state changes to sharing_active
  useEffect(() => {
    if (viewState === 'sharing_active' && sessionId && recipientToken) {
      startTracking();
    }
  }, [viewState, sessionId, recipientToken, startTracking]);

  // Step 9: Immediate revocation
  const handleStopSharing = async () => {
    setIsRevoking(true);
    
    // 1. Immediately stop local GPS observation
    stopTracking();

    if (!sessionId || !recipientToken) {
      setViewState('sharing_stopped');
      setIsRevoking(false);
      return;
    }

    // 2. Attempt server-side revocation
    try {
      const res = await revokeRecipientSession({ sessionId, recipientToken });
      if (res.success) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(`gotu_session_${invitation.id}`);
          sessionStorage.removeItem(`gotu_token_${invitation.id}`);
        }
        setViewState('sharing_stopped');
      } else {
        setServerRevocationPending(true);
        setViewState('sharing_stopped');
      }
    } catch {
      setServerRevocationPending(true);
      setViewState('sharing_stopped');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleDecline = () => {
    setViewState('declined');
  };

  // VIEW STATE: DECLINED
  if (viewState === 'declined') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md text-center shadow-lg border-muted">
          <CardHeader>
            <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <CardTitle className="text-xl">Invitation Declined</CardTitle>
            <CardDescription>
              You declined the location request from {invitation.requesterName}. No location data was shared.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <p className="text-xs text-muted-foreground">You can close this window now.</p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // VIEW STATE: EXPIRED
  if (viewState === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md text-center shadow-lg border-destructive/20">
          <CardHeader>
            <Clock className="w-12 h-12 text-destructive mx-auto mb-2" />
            <CardTitle className="text-xl">Sharing Expired</CardTitle>
            <CardDescription>
              Your location sharing session with {invitation.requesterName} has expired. Location collection has stopped and current coordinates have been purged.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <p className="text-xs text-muted-foreground">GotU never retains location history.</p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // VIEW STATE: SHARING STOPPED
  if (viewState === 'sharing_stopped') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md text-center shadow-lg border-muted">
          <CardHeader>
            <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <CardTitle className="text-xl">Sharing Stopped</CardTitle>
            <CardDescription>
              Your live location sharing session is terminated. Local GPS observation has been completely stopped and coordinates cleared.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {serverRevocationPending && (
              <Alert variant="destructive" className="text-left text-xs">
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>Server Revocation Pending</AlertTitle>
                <AlertDescription>
                  Network connection was unavailable when stopping. Local GPS has stopped immediately. Server revocation will complete automatically when connection returns.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-xs text-muted-foreground">Thank you for using GotU.</p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // VIEW STATE: SHARING ACTIVE (DASHBOARD)
  if (viewState === 'sharing_active') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md shadow-xl border-emerald-500/30">
          <CardHeader className="text-center pb-4 border-b">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50 font-semibold">
                Sharing Active
              </Badge>
            </div>
            <CardTitle className="text-xl">Sharing Location with {invitation.requesterName}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Purpose: <span className="font-medium text-foreground">{invitation.purpose}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-5">
            {/* Timer Banner */}
            <div className="bg-emerald-950/5 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800 text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Time Remaining</div>
              <div className="text-3xl font-extrabold tracking-tight font-mono my-1">
                {formatTimer(remainingSeconds)}
              </div>
              <div className="text-[11px] opacity-85">
                Session automatically ends at {expiresAt ? new Date(expiresAt).toLocaleTimeString() : 'end of duration'}
              </div>
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-md bg-muted/60 space-y-1">
                <div className="text-muted-foreground flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-primary" /> GPS Status
                </div>
                <div className="font-semibold capitalize text-foreground">
                  {geoState.gpsStatus === 'active' ? 'High Accuracy GPS' : geoState.gpsStatus}
                </div>
              </div>

              <div className="p-3 rounded-md bg-muted/60 space-y-1">
                <div className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-primary" /> Accuracy
                </div>
                <div className="font-semibold text-foreground">
                  {geoState.accuracy ? `±${Math.round(geoState.accuracy)} meters` : 'Acquiring...'}
                </div>
              </div>

              <div className="p-3 rounded-md bg-muted/60 space-y-1">
                <div className="text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-primary" /> Last Update
                </div>
                <div className="font-semibold text-foreground">
                  {geoState.lastUpdated
                    ? new Date(geoState.lastUpdated).toLocaleTimeString()
                    : 'Awaiting confirmation'}
                </div>
              </div>

              <div className="p-3 rounded-md bg-muted/60 space-y-1">
                <div className="text-muted-foreground flex items-center gap-1">
                  {geoState.connectionStatus === 'connected' ? (
                    <Signal className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <SignalZero className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  Connection
                </div>
                <div className="font-semibold capitalize text-foreground">
                  {geoState.connectionStatus === 'connected' ? 'Connected' : 'Offline (Retrying)'}
                </div>
              </div>
            </div>

            {geoState.errorMessage && (
              <Alert variant="destructive" className="text-xs">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{geoState.errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="text-[11px] text-muted-foreground text-center bg-muted/40 p-2 rounded border">
              <strong>Notice:</strong> Location updates are transmitted strictly while this browser tab remains active.
            </div>
          </CardContent>

          <CardFooter className="pt-2">
            <Button
              variant="destructive"
              className="w-full font-bold shadow-md"
              onClick={handleStopSharing}
              disabled={isRevoking}
            >
              {isRevoking ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Stopping...
                </>
              ) : (
                'Stop Sharing'
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // VIEW STATE: CONSENT FORM (DEFAULT)
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md shadow-xl border-muted">
        <CardHeader className="text-center border-b pb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold tracking-tight text-lg">GotU</span>
          </div>
          <Badge className="mx-auto mb-2" variant="secondary">
            Location Sharing Invitation
          </Badge>
          <CardTitle className="text-xl">{invitation.requesterName} is requesting your live location</CardTitle>
          <CardDescription className="mt-2 text-foreground font-medium text-sm">
            Purpose: &quot;{invitation.purpose}&quot;
          </CardDescription>
          {invitation.personalMessage && (
            <CardDescription className="mt-2 text-xs italic bg-muted/50 p-2 rounded">
              &quot;{invitation.personalMessage}&quot;
            </CardDescription>
          )}
          <div className="mt-2 text-[11px] text-muted-foreground">
            Invitation valid until {new Date(invitation.expiresAt).toLocaleString()}
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {permissionError && (
            <Alert variant="destructive" className="text-xs">
              <ShieldAlert className="w-4 h-4" />
              <AlertTitle>GPS Permission Error</AlertTitle>
              <AlertDescription className="mt-1">{permissionError}</AlertDescription>
            </Alert>
          )}

          {/* Step 3: Duration Selection (Explicit choice, NO preselected checkbox) */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" />
              1. Choose sharing duration <span className="text-destructive">*</span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={selectedDuration === 15 ? 'default' : 'outline'}
                className={selectedDuration === 15 ? 'ring-2 ring-primary' : ''}
                onClick={() => setSelectedDuration(15)}
              >
                15 Mins
              </Button>
              <Button
                type="button"
                variant={selectedDuration === 30 ? 'default' : 'outline'}
                className={selectedDuration === 30 ? 'ring-2 ring-primary' : ''}
                onClick={() => setSelectedDuration(30)}
              >
                30 Mins
              </Button>
              <Button
                type="button"
                variant={selectedDuration === 60 ? 'default' : 'outline'}
                className={selectedDuration === 60 ? 'ring-2 ring-primary' : ''}
                onClick={() => setSelectedDuration(60)}
              >
                60 Mins
              </Button>
            </div>
            {!selectedDuration && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                Please explicitly select how long you wish to share your location.
              </p>
            )}
          </div>

          {/* Privacy Disclosures */}
          <div className="space-y-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border">
            <p>
              <strong>Location Collection:</strong> GotU will periodically collect high-accuracy GPS coordinates from your browser while this page is active.
            </p>
            <p>
              <strong>Access Disclosure:</strong> Your live location will strictly be visible to <strong>{invitation.requesterName}</strong> and authorized GotU Super Administrator for operational oversight.
            </p>
            <div className="pt-1">
              <PrivacyInfoDialog />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="w-1/2" onClick={handleDecline}>
            Decline
          </Button>
          <Button
            type="button"
            className="w-1/2 font-semibold"
            disabled={!selectedDuration || isActivating}
            onClick={handleStartSharing}
          >
            {isActivating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Requesting GPS...
              </>
            ) : (
              'Start Sharing'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
