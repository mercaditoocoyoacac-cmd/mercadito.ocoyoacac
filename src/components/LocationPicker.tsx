"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
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

interface LocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  centerLat?: number;
  centerLng?: number;
}

function MapEvents({
  onLocationChange,
}: {
  onLocationChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapUpdater({
  lat,
  lng,
}: {
  lat?: number | null;
  lng?: number | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], 16);
    }
  }, [lat, lng, map]);
  return null;
}

export default function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
  centerLat = 19.4326,
  centerLng = -99.1332,
}: LocationPickerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const position = latitude && longitude ? [latitude, longitude] : [centerLat, centerLng];

  if (!mounted) {
    return (
      <div className="h-64 w-full rounded-lg bg-gray-100 animate-pulse flex items-center justify-center">
        <span className="text-gray-400">Cargando mapa...</span>
      </div>
    );
  }

  return (
    <div className="h-64 w-full rounded-lg overflow-hidden border border-[var(--border)]">
      <MapContainer
        center={position as [number, number]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onLocationChange={onLocationChange} />
        <MapUpdater lat={latitude} lng={longitude} />
        {latitude && longitude && (
          <Marker position={[latitude, longitude]} />
        )}
      </MapContainer>
    </div>
  );
}