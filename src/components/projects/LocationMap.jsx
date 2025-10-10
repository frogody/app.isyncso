
import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Circle, Polygon, Marker, Popup, useMap } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, AlertCircle } from "lucide-react";
import { parseLocationDescription } from "@/api/functions";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon in react-leaflet
import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom marker icon with app styling
const customIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.596 0 0 5.596 0 12.5c0 9.375 12.5 28.125 12.5 28.125S25 21.875 25 12.5C25 5.596 19.404 0 12.5 0z" fill="#EF4444"/>
      <circle cx="12.5" cy="12.5" r="6" fill="#151A1F"/>
    </svg>
  `),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Component to update map view
function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

export default function LocationMap({ locationDescription, onLocationDataChange, initialLocationData = null, readOnly = false }) {
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(locationDescription || "");
  const [locationData, setLocationData] = useState(initialLocationData);
  const [error, setError] = useState(null);

  // Set initial location data if provided
  useEffect(() => {
    if (initialLocationData) {
      setLocationData(initialLocationData);
    }
  }, [initialLocationData]);

  const handleParse = async () => {
    if (!inputValue.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await parseLocationDescription({ location_description: inputValue });
      
      if (response.data.success) {
        const data = response.data.location_data;
        
        // Check confidence level
        if (data.confidence && data.confidence < 0.7) {
          setError("Low confidence in location accuracy. Please be more specific or verify the result.");
        }
        
        setLocationData(data);
        onLocationDataChange(data, inputValue);
      } else {
        setError(response.data.error || "Failed to parse location");
      }
    } catch (err) {
      console.error("Location parsing error:", err);
      setError("Failed to parse location. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleParse();
    }
  };

  // Default center (Netherlands)
  const defaultCenter = [52.1326, 5.2913];
  const mapCenter = locationData?.center 
    ? [locationData.center.lat, locationData.center.lng] 
    : defaultCenter;
  
  const mapZoom = locationData ? (locationData.type === "radius" ? 10 : 8) : 7;

  return (
    <div className="space-y-4">
      <style>{`
        .leaflet-container {
          background: rgba(21, 26, 31, 0.95) !important;
          font-family: inherit;
        }
        .leaflet-tile-pane {
          filter: brightness(0.7) contrast(1.2) saturate(0.5);
        }
        .leaflet-control-zoom a {
          background: rgba(26, 32, 38, 0.95) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          color: #E9F0F1 !important;
          backdrop-filter: blur(8px);
        }
        .leaflet-control-zoom a:hover {
          background: rgba(239, 68, 68, 0.12) !important;
          border-color: rgba(239, 68, 68, 0.3) !important;
        }
        .leaflet-control-attribution {
          background: rgba(26, 32, 38, 0.9) !important;
          color: #B5C0C4 !important;
          border: 1px solid rgba(255, 255, 255, 0.06) !important;
          backdrop-filter: blur(8px);
          font-size: 10px;
        }
        .leaflet-control-attribution a {
          color: #EF4444 !important;
        }
        .leaflet-popup-content-wrapper {
          background: rgba(26, 32, 38, 0.98) !important;
          color: #E9F0F1 !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 12px !important;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        }
        .leaflet-popup-tip {
          background: rgba(26, 32, 38, 0.98) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }
        .leaflet-popup-close-button {
          color: #E9F0F1 !important;
        }
        .leaflet-popup-close-button:hover {
          color: #EF4444 !important;
        }
      `}</style>

      {!readOnly && (
        <div>
          <Label htmlFor="location_input" style={{ color: 'var(--txt)' }}>
            Describe the location
          </Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="location_input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 'Randstad' or 'within 35km of Amsterdam'"
              className="bg-transparent"
              style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)', background: 'rgba(255,255,255,.02)' }}
              disabled={loading}
            />
            <Button
              type="button"
              onClick={handleParse}
              disabled={loading || !inputValue.trim()}
              className="btn-primary whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  Show
                </>
              )}
            </Button>
          </div>
          {error && (
            <div className="flex items-start gap-2 mt-2 p-3 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <AlertCircle className="w-4 h-4 mt-0.5" style={{ color: '#EF4444' }} />
              <p className="text-sm" style={{ color: '#FCA5A5' }}>{error}</p>
            </div>
          )}
        </div>
      )}

      {locationData && (
        <div className="flex items-center justify-between mt-2 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--txt)' }}>
              {locationData.display_name || inputValue}
            </p>
            {locationData.confidence && (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Confidence: {Math.round(locationData.confidence * 100)}%
              </p>
            )}
          </div>
          {locationData.type === 'polygon' && locationData.polygon && (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {locationData.polygon.length} boundary points
            </p>
          )}
        </div>
      )}

      <div 
        className="rounded-lg overflow-hidden border" 
        style={{ 
          height: '400px',
          borderColor: 'rgba(255,255,255,.12)',
          background: 'rgba(21, 26, 31, 0.95)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)'
        }}
      >
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapUpdater center={mapCenter} zoom={mapZoom} />
          
          {locationData && locationData.type === "radius" && (
            <Circle
              center={[locationData.center.lat, locationData.center.lng]}
              radius={locationData.radius * 1000}
              pathOptions={{
                color: '#EF4444',
                fillColor: '#EF4444',
                fillOpacity: 0.15,
                weight: 2,
                opacity: 0.8
              }}
            />
          )}

          {locationData && locationData.type === "polygon" && locationData.polygon && (
            <Polygon
              positions={locationData.polygon.map(p => [p.lat, p.lng])}
              pathOptions={{
                color: '#EF4444',
                fillColor: '#EF4444',
                fillOpacity: 0.15,
                weight: 2,
                opacity: 0.8
              }}
            />
          )}

          {locationData && (
            <Marker 
              position={[locationData.center.lat, locationData.center.lng]}
              icon={customIcon}
            >
              <Popup>
                <div className="p-1">
                  <p className="font-semibold text-sm">{locationData.display_name || inputValue}</p>
                  {locationData.type === 'radius' && (
                    <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                      Radius: {locationData.radius} km
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
