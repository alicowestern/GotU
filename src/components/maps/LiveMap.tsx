'use client';

import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SessionLocationData } from '@/features/locations/useAuthorizedLocations';
import { AuthorizedSessionSummary } from '@/features/sessions/actions';

export type MapMarkerItem = {
  session: AuthorizedSessionSummary;
  location: SessionLocationData | null;
};

interface LiveMapProps {
  markers: MapMarkerItem[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  centerOverride?: [number, number] | null;
}

// Custom Leaflet DivIcons to bypass image loading issues and provide modern SVG visuals
function createCustomMarkerIcon(label: string, isStale: boolean, isSelected: boolean) {
  const pinColor = isStale ? '#f59e0b' : '#10b981'; // Amber if stale, Emerald if active
  const ringColor = isStale ? '#fde68a' : '#a7f3d0';
  const pulseClass = isStale ? '' : 'animate-ping';
  const scale = isSelected ? 'transform: scale(1.15);' : '';

  const html = `
    <div style="position: relative; width: 36px; height: 36px; ${scale}">
      ${
        !isStale
          ? `<div style="position: absolute; inset: -4px; border-radius: 50%; background-color: ${ringColor}; opacity: 0.6; class="${pulseClass}"></div>`
          : ''
      }
      <div style="position: relative; width: 36px; height: 36px; background-color: ${pinColor}; border: 3px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'gotu-custom-map-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

// Controller component inside MapContainer to adjust view programmatically
function MapController({
  markers,
  selectedSessionId,
  centerOverride,
}: {
  markers: MapMarkerItem[];
  selectedSessionId: string | null;
  centerOverride?: [number, number] | null;
}) {
  const map = useMap();

  // Invalidate size when mounted to prevent gray/unrendered tile glitches
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);

  // Center on explicit override or selected session
  useEffect(() => {
    if (centerOverride) {
      map.flyTo(centerOverride, 15, { duration: 1 });
      return;
    }

    if (selectedSessionId) {
      const selected = markers.find((m) => m.session.id === selectedSessionId);
      if (
        selected &&
        selected.location &&
        typeof selected.location.latitude === 'number' &&
        typeof selected.location.longitude === 'number'
      ) {
        map.flyTo([selected.location.latitude, selected.location.longitude], 15, { duration: 1 });
      }
    }
  }, [selectedSessionId, centerOverride, markers, map]);

  return null;
}

export default function LiveMap({ markers, selectedSessionId, onSelectSession, centerOverride }: LiveMapProps) {
  // Active valid locations for mapping
  const validMarkers = useMemo(() => {
    return markers.filter(
      (m) =>
        m.location &&
        typeof m.location.latitude === 'number' &&
        typeof m.location.longitude === 'number' &&
        (m.session.status === 'active' || m.location.status === 'active' || m.location.status === 'stale')
    );
  }, [markers]);

  // Default center: London or first marker position
  const defaultCenter: [number, number] = useMemo(() => {
    if (validMarkers.length > 0 && validMarkers[0].location) {
      return [validMarkers[0].location.latitude!, validMarkers[0].location.longitude!];
    }
    return [51.505, -0.09]; // Default coordinate
  }, [validMarkers]);

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: '350px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController markers={validMarkers} selectedSessionId={selectedSessionId} centerOverride={centerOverride} />

        {validMarkers.map(({ session, location }) => {
          if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
            return null;
          }

          const isStale = location.isStale || location.status === 'stale';
          const isSelected = selectedSessionId === session.id;
          const icon = createCustomMarkerIcon(
            session.recipient_label || 'Recipient',
            isStale,
            isSelected
          );

          const lastUpdateText = location.recordedAt
            ? new Date(location.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : 'Unknown';

          return (
            <React.Fragment key={session.id}>
              {/* Accuracy Radius Circle */}
              {typeof location.accuracyMeters === 'number' && location.accuracyMeters > 0 && (
                <Circle
                  center={[location.latitude, location.longitude]}
                  radius={location.accuracyMeters}
                  pathOptions={{
                    color: isStale ? '#f59e0b' : '#10b981',
                    fillColor: isStale ? '#fde68a' : '#a7f3d0',
                    fillOpacity: isStale ? 0.15 : 0.25,
                    weight: isStale ? 1 : 2,
                    dashArray: isStale ? '4, 4' : undefined,
                  }}
                />
              )}

              {/* Marker Pin */}
              <Marker
                position={[location.latitude, location.longitude]}
                icon={icon}
                eventHandlers={{
                  click: () => onSelectSession(session.id),
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1 min-w-[160px]">
                    <div className="font-semibold text-sm flex items-center justify-between gap-2">
                      <span>{session.recipient_label || 'Recipient'}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          isStale ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isStale ? 'Stale' : 'Active'}
                      </span>
                    </div>
                    {session.purpose && (
                      <p className="text-xs text-gray-500 italic">&quot;{session.purpose}&quot;</p>
                    )}
                    <div className="text-xs text-gray-600 border-t pt-1 mt-1 space-y-0.5">
                      <div>Accuracy: ±{Math.round(location.accuracyMeters || 0)}m</div>
                      <div>Last update: {lastUpdateText}</div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
