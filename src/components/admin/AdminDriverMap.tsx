"use client";

import { useEffect, useMemo, useRef } from "react";
import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api";

const containerStyle = { width: "100%", height: "100%" };
const DEFAULT_CENTER = { lat: 19.2886, lng: -99.4498 };

export interface MapPoint {
  id: string;
  label: string;
  lat: number;
  lng: number;
  kind: "store" | "driver" | "customer";
  updatedAt?: string | null;
  driverId?: string;
}

interface AdminDriverMapProps {
  points: MapPoint[];
  height?: string;
}

function staleMinutes(updatedAt?: string | null): number | null {
  if (!updatedAt) return null;
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000);
}

export default function AdminDriverMap({ points, height = "320px" }: AdminDriverMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script-admin-envios",
    googleMapsApiKey: apiKey,
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  const center = useMemo(() => {
    if (points.length === 0) return DEFAULT_CENTER;
    const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
    return { lat, lng };
  }, [points]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || points.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    mapRef.current.fitBounds(bounds, 60);
  }, [isLoaded, points]);

  if (!apiKey) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-[var(--border)] bg-gray-50 px-4 text-center text-xs text-[color:var(--muted)]"
        style={{ height }}
      >
        Configura NEXT_PUBLIC_GOOGLE_MAPS_KEY para ver el mapa
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="rounded-xl bg-gray-100 animate-pulse flex items-center justify-center"
        style={{ height }}
      >
        <span className="text-sm text-gray-400">Cargando mapa...</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-[var(--border)]" style={{ height }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={13}
        onLoad={(map) => {
          mapRef.current = map;
        }}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#525252" }] },
            { featureType: "poi", elementType: "geometry", stylers: [{ color: "#dedede" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
          ],
        }}
      >
        {points.map((p) => {
          const stale = p.kind === "driver" ? staleMinutes(p.updatedAt) : null;
          const staleColor = stale !== null && stale > 10 ? "#dc2626" : stale !== null && stale >= 2 ? "#f59e0b" : "#16a34a";

          const icon =
            p.kind === "driver"
              ? {
                  path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 5,
                  fillColor: staleColor,
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                }
              : {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: p.kind === "store" ? 8 : 7,
                  fillColor: p.kind === "store" ? "#f59e0b" : "#ef4444",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                };

          return (
            <MarkerF
              key={p.id}
              position={{ lat: p.lat, lng: p.lng }}
              title={p.label}
              zIndex={p.kind === "driver" ? 20 : 10}
              label={
                p.kind === "driver"
                  ? stale !== null && stale >= 2
                    ? { text: `${stale}m`, color: "#ffffff", fontSize: "10px", fontWeight: "700" }
                    : undefined
                  : { text: p.kind === "store" ? "T" : "C", color: "#ffffff", fontSize: "10px", fontWeight: "700" }
              }
              icon={icon}
            />
          );
        })}

        {points
          .filter((p) => p.kind === "customer" && p.driverId)
          .map((c) => {
            const driver = points.find((p) => p.kind === "driver" && p.id === `driver:${c.driverId}`);
            if (!driver) return null;
            return (
              <PolylineF
                key={`line-${c.id}`}
                path={[
                  { lat: driver.lat, lng: driver.lng },
                  { lat: c.lat, lng: c.lng },
                ]}
                options={{
                  strokeColor: "#2563eb",
                  strokeOpacity: 0.65,
                  strokeWeight: 3,
                }}
              />
            );
          })}
      </GoogleMap>
    </div>
  );
}
