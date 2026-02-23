import React, { useState, useRef, useCallback, useMemo } from 'react';
import Map, { Source, Layer, Marker, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Navigation, Loader2, Package, Truck } from 'lucide-react';
import { format } from 'date-fns';
import useTrackingData from '@/hooks/useTrackingData';
import AfterShipStatusBadge from './AfterShipStatusBadge';
import CheckpointItem from './CheckpointItem';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getBounds(points) {
  if (points.length === 0) return null;
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const p of points) {
    if (p.longitude < minLng) minLng = p.longitude;
    if (p.longitude > maxLng) maxLng = p.longitude;
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
  }
  return [[minLng, minLat], [maxLng, maxLat]];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ShipmentTrackingMap({ orderId }) {
  const { trackingJob, checkpoints, isLoading, error } = useTrackingData({ orderId });
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);
  const mapRef = useRef(null);

  // Checkpoints with valid coordinates
  const geoCheckpoints = useMemo(
    () => checkpoints.filter((c) => c.latitude && c.longitude),
    [checkpoints],
  );

  // Latest checkpoint (last by time)
  const latestCheckpoint = checkpoints.length > 0 ? checkpoints[checkpoints.length - 1] : null;

  // GeoJSON line connecting checkpoints
  const routeLine = useMemo(() => {
    if (geoCheckpoints.length < 2) return null;
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: geoCheckpoints.map((c) => [c.longitude, c.latitude]),
      },
    };
  }, [geoCheckpoints]);

  // Fly to a checkpoint on the map
  const flyTo = useCallback((checkpoint) => {
    if (!checkpoint?.latitude || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [checkpoint.longitude, checkpoint.latitude],
      zoom: 12,
      duration: 1200,
    });
    setSelectedCheckpoint(checkpoint);
  }, []);

  // Fit bounds to all points
  const fitBounds = useCallback(() => {
    if (!mapRef.current || geoCheckpoints.length === 0) return;
    const bounds = getBounds(geoCheckpoints);
    if (!bounds) return;

    if (geoCheckpoints.length === 1) {
      mapRef.current.flyTo({
        center: [geoCheckpoints[0].longitude, geoCheckpoints[0].latitude],
        zoom: 10,
        duration: 800,
      });
    } else {
      mapRef.current.fitBounds(bounds, { padding: 60, duration: 800 });
    }
  }, [geoCheckpoints]);

  const onMapLoad = useCallback(() => {
    fitBounds();
  }, [fitBounds]);

  // ─── Loading / Empty states ─────────────────────────────────────────────

  if (isLoading) {
    return (
      <div
        className="rounded-xl p-8 flex items-center justify-center"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
        }}
      >
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--ws-primary)' }} />
        <span className="ml-2 text-sm" style={{ color: 'var(--ws-text-muted)' }}>
          Loading tracking data...
        </span>
      </div>
    );
  }

  if (error) {
    console.error('[ShipmentTrackingMap] Error loading tracking data:', error);
    return (
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}
          >
            <Truck className="w-4 h-4" style={{ color: 'rgba(239,68,68,0.8)' }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
              Tracking Unavailable
            </p>
            <p className="text-xs" style={{ color: 'var(--ws-text-muted)' }}>
              Unable to load shipment tracking data. Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!trackingJob) {
    return (
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(34,211,238,0.1)' }}
          >
            <Truck className="w-4 h-4" style={{ color: 'var(--ws-primary)' }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
              Tracking Pending
            </p>
            <p className="text-xs" style={{ color: 'var(--ws-text-muted)' }}>
              Tracking data is being set up. It will appear here once available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (checkpoints.length === 0) {
    return (
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(34,211,238,0.1)' }}
          >
            <Truck className="w-4 h-4" style={{ color: 'var(--ws-primary)' }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
              Tracking Registered
            </p>
            <p className="text-xs" style={{ color: 'var(--ws-text-muted)' }}>
              {trackingJob.track_trace_code} via {trackingJob.carrier || 'carrier'}
            </p>
          </div>
        </div>
        <p className="text-xs" style={{ color: 'var(--ws-text-muted)' }}>
          Waiting for carrier updates. Tracking information will appear here once the carrier scans your package.
        </p>
      </div>
    );
  }

  // ─── Map + Sidebar layout ──────────────────────────────────────────────

  const showMap = geoCheckpoints.length > 0 && MAPBOX_TOKEN;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--ws-border)' }}
      >
        <div className="flex items-center gap-3">
          <Navigation className="w-4 h-4" style={{ color: 'var(--ws-primary)' }} />
          <div>
            <span className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
              Track Shipment
            </span>
            {trackingJob.expected_delivery && (
              <span className="ml-3 text-xs" style={{ color: 'var(--ws-text-muted)' }}>
                Expected: {format(new Date(trackingJob.expected_delivery), 'dd MMM yyyy')}
              </span>
            )}
          </div>
        </div>
        <AfterShipStatusBadge tag={trackingJob.aftership_tag || latestCheckpoint?.status_tag || 'Pending'} />
      </div>

      {/* Content: Map + Sidebar */}
      <div className={`flex flex-col ${showMap ? 'lg:flex-row' : ''}`}>
        {/* Map */}
        {showMap && (
          <div className="relative flex-1 h-[300px] lg:h-[380px]">
            <Map
              ref={mapRef}
              initialViewState={{
                longitude: geoCheckpoints[0]?.longitude || 5.0,
                latitude: geoCheckpoints[0]?.latitude || 52.0,
                zoom: 6,
              }}
              style={{ width: '100%', height: '100%' }}
              mapStyle={MAP_STYLE}
              mapboxAccessToken={MAPBOX_TOKEN}
              onLoad={onMapLoad}
              attributionControl={false}
            >
              {/* Route polyline */}
              {routeLine && (
                <Source id="route" type="geojson" data={routeLine}>
                  <Layer
                    id="route-line"
                    type="line"
                    paint={{
                      'line-color': 'rgb(34,211,238)',
                      'line-width': 2.5,
                      'line-opacity': 0.6,
                      'line-dasharray': [2, 2],
                    }}
                  />
                </Source>
              )}

              {/* Past checkpoint markers */}
              {geoCheckpoints.slice(0, -1).map((cp) => (
                <Marker
                  key={cp.id}
                  longitude={cp.longitude}
                  latitude={cp.latitude}
                  anchor="center"
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    setSelectedCheckpoint(cp);
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full border-2 cursor-pointer"
                    style={{
                      backgroundColor: 'rgb(34,211,238)',
                      borderColor: 'rgba(34,211,238,0.4)',
                    }}
                  />
                </Marker>
              ))}

              {/* Latest checkpoint marker (pulsing) */}
              {geoCheckpoints.length > 0 && (() => {
                const latest = geoCheckpoints[geoCheckpoints.length - 1];
                return (
                  <Marker
                    longitude={latest.longitude}
                    latitude={latest.latitude}
                    anchor="center"
                    onClick={(e) => {
                      e.originalEvent.stopPropagation();
                      setSelectedCheckpoint(latest);
                    }}
                  >
                    <div className="relative cursor-pointer">
                      <div
                        className="w-4 h-4 rounded-full border-2"
                        style={{
                          backgroundColor: 'rgb(34,211,238)',
                          borderColor: '#fff',
                        }}
                      />
                      <div
                        className="absolute inset-[-4px] rounded-full animate-ping"
                        style={{
                          backgroundColor: 'rgb(34,211,238)',
                          opacity: 0.3,
                        }}
                      />
                    </div>
                  </Marker>
                );
              })()}

              {/* Popup */}
              {selectedCheckpoint && selectedCheckpoint.latitude && (
                <Popup
                  longitude={selectedCheckpoint.longitude}
                  latitude={selectedCheckpoint.latitude}
                  anchor="bottom"
                  onClose={() => setSelectedCheckpoint(null)}
                  closeButton={true}
                  closeOnClick={false}
                  className="tracking-popup"
                >
                  <div className="p-1 min-w-[160px]">
                    <p className="text-xs font-semibold text-zinc-900">
                      {selectedCheckpoint.status_description || selectedCheckpoint.status_tag}
                    </p>
                    {selectedCheckpoint.location_name && (
                      <p className="text-[11px] text-zinc-600 mt-0.5">
                        {selectedCheckpoint.location_name}
                      </p>
                    )}
                    <p className="text-[10px] text-zinc-500 mt-1">
                      {format(new Date(selectedCheckpoint.checkpoint_time), 'dd MMM yyyy, HH:mm')}
                    </p>
                  </div>
                </Popup>
              )}
            </Map>
          </div>
        )}

        {/* Sidebar: Checkpoint list */}
        <div
          className={`
            ${showMap ? 'lg:w-[280px] lg:border-l' : 'w-full'}
            max-h-[380px] overflow-y-auto
          `}
          style={{ borderColor: 'var(--ws-border)' }}
        >
          <div
            className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider sticky top-0 z-10"
            style={{
              color: 'var(--ws-text-muted)',
              backgroundColor: 'var(--ws-surface)',
              borderBottom: '1px solid var(--ws-border)',
            }}
          >
            Checkpoints ({checkpoints.length})
          </div>
          <div className="py-1">
            {[...checkpoints].reverse().map((cp, idx) => (
              <CheckpointItem
                key={cp.id}
                checkpoint={cp}
                isLatest={idx === 0}
                isFirst={idx === 0}
                onClick={flyTo}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Tracking number footer */}
      <div
        className="flex items-center justify-between px-5 py-2.5 text-[11px]"
        style={{
          borderTop: '1px solid var(--ws-border)',
          color: 'var(--ws-text-muted)',
        }}
      >
        <span>
          <Package className="w-3 h-3 inline mr-1.5 -mt-0.5" />
          {trackingJob.track_trace_code}
        </span>
        <span>{trackingJob.carrier}</span>
      </div>
    </div>
  );
}
