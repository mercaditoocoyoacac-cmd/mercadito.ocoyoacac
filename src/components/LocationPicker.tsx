"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from "react-leaflet";
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

const userIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 18px;
    height: 18px;
    background: #3b82f6;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0 0 2px #3b82f6, 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
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
  userLat,
  userLng,
}: {
  lat?: number | null;
  lng?: number | null;
  userLat?: number | null;
  userLng?: number | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (userLat && userLng) {
      map.setView([userLat, userLng], 15);
    } else if (lat && lng) {
      map.setView([lat, lng], 16);
    }
  }, [lat, lng, userLat, userLng, map]);
  return null;
}

export default function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
  centerLat = 19.2886,
  centerLng = -99.4498,
}: LocationPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    setMounted(true);
    if ("geolocation" in navigator) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          if (!latitude || !longitude) {
            onLocationChange(pos.coords.latitude, pos.coords.longitude);
          }
          setLocating(false);
        },
        () => {
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
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
    <div className="relative h-64 w-full rounded-lg overflow-hidden border border-[var(--border)]">
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
        <MapUpdater lat={latitude} lng={longitude} userLat={userLocation?.lat} userLng={userLocation?.lng} />
        {latitude && longitude && (
          <Marker position={[latitude, longitude]} />
        )}
        {userLocation && (
          <>
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={userIcon}
            />
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={userLocation.accuracy}
              pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.1, weight: 1 }}
            />
          </>
        )}
      </MapContainer>
      {locating && (
        <div className="absolute top-2 left-2 z-[400] rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-600 shadow">
          Obteniendo ubicación...
        </div>
      )}
    </div>
  );
}
