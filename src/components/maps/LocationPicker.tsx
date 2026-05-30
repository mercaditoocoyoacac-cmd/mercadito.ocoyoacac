"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap, Popup } from "react-leaflet";
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

const chosenIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 30px;
    height: 30px;
    background: #1a7a4a;
    border: 4px solid white;
    border-radius: 50%;
    box-shadow: 0 3px 12px rgba(26,122,74,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
  "><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const userIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 18px;
    height: 18px;
    background: #3b82f6;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0 0 2px #3b82f6, 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

L.Marker.prototype.options.icon = markerIcon;

interface LocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  centerLat?: number;
  centerLng?: number;
}

function MapEvents({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => { onLocationChange(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

function MapUpdater({ lat, lng, userLat, userLng }: { lat?: number | null; lng?: number | null; userLat?: number | null; userLng?: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (userLat && userLng) map.setView([userLat, userLng], 16, { animate: true });
    else if (lat && lng) map.setView([lat, lng], 16, { animate: true });
  }, [lat, lng, userLat, userLng, map]);
  return null;
}

function LocateButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-all z-[1000]"
    >
      <svg className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {loading ? (
          <>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </>
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        )}
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      {loading ? "Buscando..." : "Mi ubicación"}
    </button>
  );
}

function SearchBox({ onSelect }: { onSelect: (lat: number, lng: number, displayName: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ lat: string; lon: string; display_name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const search = (val: string) => {
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.length < 4) { setResults([]); setOpen(false); return; }
    timerRef.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&countrycodes=mx`);
        const data = await res.json();
        setResults(data);
        setOpen(true);
      } catch { setResults([]); }
      setSearching(false);
    }, 500);
  };

  return (
    <div ref={ref} className="relative z-[1000]">
      <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 shadow-md border border-gray-200">
        <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Buscar dirección..."
          className="w-36 sm:w-48 bg-transparent text-xs outline-none placeholder:text-gray-400"
        />
        {searching && <svg className="h-3 w-3 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg bg-white shadow-lg border border-gray-200 overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onSelect(parseFloat(r.lat), parseFloat(r.lon), r.display_name);
                setQuery(r.display_name.split(",")[0]);
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LocationPicker({
  latitude, longitude, onLocationChange, centerLat = 19.2886, centerLng = -99.4498,
}: LocationPickerProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  const locateMe = () => {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        onLocationChange(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => { setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const position = latitude && longitude ? [latitude, longitude] : [centerLat, centerLng];

  if (!mounted) {
    return (
      <div className="h-64 w-full rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
        <span className="text-sm text-gray-400">Cargando mapa...</span>
      </div>
    );
  }

  return (
    <div className="relative h-64 w-full rounded-xl overflow-hidden border border-[var(--border)] shadow-sm">
      <MapContainer
        center={position as [number, number]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <MapEvents onLocationChange={onLocationChange} />
        <MapUpdater lat={latitude} lng={longitude} userLat={userLocation?.lat} userLng={userLocation?.lng} />
        {latitude && longitude && (
          <Marker position={[latitude, longitude]} icon={chosenIcon}>
            <Popup>
              <div className="text-xs font-medium">📍 Ubicación de entrega</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{latitude.toFixed(6)}, {longitude.toFixed(6)}</div>
            </Popup>
          </Marker>
        )}
        {userLocation && (
          <>
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={userLocation.accuracy}
              pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.08, weight: 1.5, dashArray: "4 4" }}
            />
          </>
        )}
      </MapContainer>

      {/* Top controls */}
      <div className="absolute top-2 left-2 right-2 flex items-start gap-2 z-[400]">
        <SearchBox onSelect={(lat, lng) => onLocationChange(lat, lng)} />
        <LocateButton onClick={locateMe} loading={locating} />
      </div>

      {/* Bottom hint */}
      <div className="absolute bottom-2 left-2 right-2 z-[400]">
        <div className="mx-auto w-fit rounded-full bg-white/80 backdrop-blur-sm px-3 py-1 text-[10px] text-gray-500 shadow-sm border border-gray-200/50">
          Haz clic en el mapa para colocar el marcador
        </div>
      </div>
    </div>
  );
}
