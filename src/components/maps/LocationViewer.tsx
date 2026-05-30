"use client";

import { useSyncExternalStore } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = markerIcon;

interface LocationViewerProps {
  latitude: number | null;
  longitude: number | null;
  height?: string;
  label?: string;
}

export default function LocationViewer({
  latitude,
  longitude,
  height = "h-48",
  label,
}: LocationViewerProps) {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  if (!mounted) {
    return (
      <div className={`${height} w-full rounded-xl bg-gray-100 animate-pulse flex items-center justify-center`}>
        <span className="text-sm text-gray-400">Cargando mapa...</span>
      </div>
    );
  }

  if (!latitude || !longitude) {
    return (
      <div className={`${height} w-full rounded-xl bg-gray-50 border border-dashed border-gray-300 flex flex-col items-center justify-center gap-2`}>
        <svg className="h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-sm text-gray-400">Sin ubicación registrada</span>
      </div>
    );
  }

  return (
    <div className={`${height} w-full rounded-xl overflow-hidden border border-[var(--border)] shadow-sm`}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <Marker position={[latitude, longitude]}>
          {label && (
            <Popup>
              <div className="text-xs font-medium">{label}</div>
            </Popup>
          )}
        </Marker>
      </MapContainer>
      {label && (
        <div className="absolute bottom-2 left-2 right-2 z-[400]">
          <div className="mx-auto w-fit rounded-full bg-white/80 backdrop-blur-sm px-3 py-1 text-[10px] text-gray-500 shadow-sm border border-gray-200/50">
            {label}
          </div>
        </div>
      )}
    </div>
  );
}
