import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, Globe, Moon, Sun, Mountain } from 'lucide-react';

export interface MapMarkerItem {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: 'VEHICLE' | 'FARM' | 'WAREHOUSE' | 'RETAILER';
  status?: string;
  temperatureC?: number;
  speedKmh?: number;
  subtitle?: string;
  details?: Record<string, any>;
}

export interface MapGeofenceItem {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  type: string;
}

export interface MapRouteItem {
  id: string;
  from: [number, number];
  to: [number, number];
  color?: string;
}

interface LeafletMapProps {
  markers?: MapMarkerItem[];
  geofences?: MapGeofenceItem[];
  routes?: MapRouteItem[];
  center?: [number, number];
  zoom?: number;
  className?: string;
}

const MAPBOX_TOKEN = (import.meta as any).env?.VITE_MAPBOX_TOKEN || '';

type MapStyle = 'streets' | 'satellite' | 'dark' | 'outdoors';

const MAP_STYLES: Record<MapStyle, { name: string; styleId: string; icon: string }> = {
  streets: { name: 'Streets', styleId: 'mapbox/streets-v12', icon: '🛣️' },
  satellite: { name: 'Satellite', styleId: 'mapbox/satellite-streets-v12', icon: '🛰️' },
  dark: { name: 'Navigation Night', styleId: 'mapbox/navigation-night-v1', icon: '🌙' },
  outdoors: { name: 'Outdoors / Terrain', styleId: 'mapbox/outdoors-v12', icon: '⛰️' }
};

export const LeafletMap: React.FC<LeafletMapProps> = ({
  markers = [],
  geofences = [],
  routes = [],
  center = [36.7783, -119.4179], // California Central Valley
  zoom = 7,
  className = 'h-96'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());

  const [activeStyle, setActiveStyle] = useState<MapStyle>(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'streets';
  });

  const getTileUrl = (style: MapStyle): string => {
    if (MAPBOX_TOKEN) {
      const styleId = MAP_STYLES[style].styleId;
      return `https://api.mapbox.com/styles/v1/${styleId}/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`;
    }
    return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  };

  const getAttribution = (): string => {
    if (MAPBOX_TOKEN) {
      return '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
    }
    return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: true,
        scrollWheelZoom: true
      });

      const tileLayer = L.tileLayer(getTileUrl(activeStyle), {
        attribution: getAttribution(),
        maxZoom: 19,
        tileSize: 256,
        zoomOffset: 0
      }).addTo(map);

      tileLayerRef.current = tileLayer;
      markerLayerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      // Invalidate size to ensure full tile rendering across all screen sizes
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }
  }, []);

  // Switch Tile Layer when activeStyle changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const newTileLayer = L.tileLayer(getTileUrl(activeStyle), {
      attribution: getAttribution(),
      maxZoom: 19,
      tileSize: 256,
      zoomOffset: 0
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTileLayer;
  }, [activeStyle]);

  // Update markers, geofences, and routes dynamically on state update
  useEffect(() => {
    if (!mapInstanceRef.current || !markerLayerGroupRef.current) return;

    const layerGroup = markerLayerGroupRef.current;
    const currentMarkerIds = new Set(markers.map(m => m.id));

    // Remove obsolete markers
    markersMapRef.current.forEach((marker, id) => {
      if (!currentMarkerIds.has(id)) {
        layerGroup.removeLayer(marker);
        markersMapRef.current.delete(id);
      }
    });

    // 1. Draw Geofences (clear previous fences/polylines)
    layerGroup.eachLayer(l => {
      if (l instanceof L.Circle || l instanceof L.Polyline) {
        layerGroup.removeLayer(l);
      }
    });

    geofences.forEach(fence => {
      const color = fence.type === 'WAREHOUSE' ? '#16a34a' : (fence.type === 'DELIVERY' ? '#0284c7' : '#d97706');
      const circle = L.circle([fence.lat, fence.lng], {
        radius: fence.radiusMeters,
        color,
        fillColor: color,
        fillOpacity: 0.18,
        weight: 2,
        dashArray: '4, 4'
      });
      circle.bindTooltip(`Geofence: ${fence.name} (${fence.radiusMeters}m)`, { permanent: false });
      layerGroup.addLayer(circle);
    });

    // 2. Draw Routes
    routes.forEach(route => {
      const polyline = L.polyline([route.from, route.to], {
        color: route.color || '#0284c7',
        weight: 3,
        opacity: 0.8,
        dashArray: '6, 6'
      });
      layerGroup.addLayer(polyline);
    });

    // 3. Update or Add Markers smoothly
    markers.forEach(m => {
      let iconHtml = '';
      if (m.type === 'VEHICLE') {
        const isWarning = m.temperatureC !== undefined && m.temperatureC > 8.0;
        const colorClass = isWarning ? 'bg-rose-500 ring-rose-300' : 'bg-cold-600 ring-cold-300';
        iconHtml = `
          <div class="relative flex items-center justify-center transition-all duration-700">
            <span class="absolute w-8 h-8 rounded-full ${colorClass} opacity-40 animate-ping"></span>
            <div class="w-8 h-8 rounded-full ${colorClass} ring-4 text-white flex items-center justify-center font-bold text-xs shadow-lg">
              🚚
            </div>
            ${m.temperatureC !== undefined ? `
              <div class="absolute -bottom-5 px-1.5 py-0.5 rounded text-[10px] font-bold ${isWarning ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'} shadow whitespace-nowrap">
                ${m.temperatureC}°C
              </div>
            ` : ''}
          </div>
        `;
      } else if (m.type === 'FARM') {
        iconHtml = `
          <div class="w-7 h-7 rounded-full bg-agri-600 ring-3 ring-agri-200 text-white flex items-center justify-center text-xs shadow-md">
            🌱
          </div>
        `;
      } else if (m.type === 'WAREHOUSE') {
        iconHtml = `
          <div class="w-7 h-7 rounded-full bg-slate-800 ring-3 ring-slate-300 text-white flex items-center justify-center text-xs shadow-md">
            🏭
          </div>
        `;
      } else {
        iconHtml = `
          <div class="w-7 h-7 rounded-full bg-amber-500 ring-3 ring-amber-200 text-white flex items-center justify-center text-xs shadow-md">
            🏪
          </div>
        `;
      }

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const popupContent = `
        <div style="font-family: sans-serif; font-size: 12px; min-width: 170px;">
          <strong style="font-size: 13px; color: #0f172a;">${m.title}</strong><br/>
          <span style="color: #64748b;">${m.subtitle || m.type}</span>
          ${m.temperatureC !== undefined ? `<div style="margin-top: 4px; font-weight: bold; color: ${m.temperatureC > 8.0 ? '#e11d48' : '#0284c7'};">🌡️ Temp: ${m.temperatureC}°C</div>` : ''}
          ${m.speedKmh !== undefined ? `<div style="color: #475569;">⚡ Speed: ${m.speedKmh} km/h</div>` : ''}
          ${m.status ? `<div style="margin-top: 4px; display: inline-block; padding: 2px 6px; background: #e2e8f0; border-radius: 4px; font-size: 10px; font-weight: bold;">${m.status}</div>` : ''}
        </div>
      `;

      if (markersMapRef.current.has(m.id)) {
        const existingMarker = markersMapRef.current.get(m.id)!;
        existingMarker.setLatLng([m.lat, m.lng]);
        existingMarker.setIcon(customIcon);
        existingMarker.setPopupContent(popupContent);
      } else {
        const marker = L.marker([m.lat, m.lng], { icon: customIcon });
        marker.bindPopup(popupContent);
        layerGroup.addLayer(marker);
        markersMapRef.current.set(m.id, marker);
      }
    });
  }, [markers, geofences, routes]);

  return (
    <div className={`w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800 relative group ${className}`}>
      {/* Mapbox Style Switcher Floating Controls */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl p-1 shadow-lg border border-slate-200 dark:border-slate-700 text-xs">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase px-2 hidden sm:inline">
          Mapbox HD
        </span>
        <div className="flex space-x-1">
          {(Object.keys(MAP_STYLES) as MapStyle[]).map(styleKey => (
            <button
              key={styleKey}
              onClick={() => setActiveStyle(styleKey)}
              title={MAP_STYLES[styleKey].name}
              className={`px-2 py-1 rounded-lg font-semibold transition-all flex items-center space-x-1 ${
                activeStyle === styleKey
                  ? 'bg-cold-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{MAP_STYLES[styleKey].icon}</span>
              <span className="hidden md:inline text-[11px]">{MAP_STYLES[styleKey].name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      <div ref={mapContainerRef} className="w-full h-full min-h-[350px]" />
    </div>
  );
};
