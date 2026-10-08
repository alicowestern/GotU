'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { SessionLocationData } from '@/features/locations/useAuthorizedLocations';
import { AuthorizedSessionSummary } from '@/features/sessions/actions';

export type MapMarkerItem = {
  session: AuthorizedSessionSummary;
  location: SessionLocationData | null;
};

interface LiveMapWrapperProps {
  markers: MapMarkerItem[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  centerOverride?: [number, number] | null;
}

const LiveMapDynamic = dynamic(() => import('./LiveMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[350px] bg-muted/40 rounded-lg animate-pulse flex flex-col items-center justify-center border text-muted-foreground p-6">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
      <p className="text-sm font-medium">Initializing Interactive Live Map...</p>
    </div>
  ),
});

export default function LiveMapWrapper(props: LiveMapWrapperProps) {
  return <LiveMapDynamic {...props} />;
}
