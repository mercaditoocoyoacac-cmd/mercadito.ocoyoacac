"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

interface LocationViewerProps {
  latitude: number | null;
  longitude: number | null;
  height?: string;
}

export default function LocationViewer({
  latitude,
  longitude,
  height = "h-48",
}: LocationViewerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`${height} w-full rounded-lg bg-gray-100 animate-pulse flex items-center justify-center`}>
        <span className="text-gray-400">Cargando mapa...</span>
      </div>
    );
  }

  if (!latitude || !longitude) {
    return (
      <div className={`${height} w-full rounded-lg bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center`}>
        <span className="text-gray-400 text-sm">Sin ubicación registrada</span>
      </div>
    );
  }

  return (
    <div className={`${height} w-full rounded-lg overflow-hidden border border-[var(--border)]`}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} />
      </MapContainer>
    </div>
  );
}