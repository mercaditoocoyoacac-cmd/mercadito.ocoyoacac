"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useJsApiLoader, GoogleMap, Marker, Circle, Autocomplete } from "@react-google-maps/api";

const containerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 19.2886, lng: -99.4498 };

interface LocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  centerLat?: number;
  centerLng?: number;
}

export default function LocationPicker({ latitude, longitude, onLocationChange, centerLat = 19.2886, centerLng = -99.4498 }: LocationPickerProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script-picker",
    googleMapsApiKey: apiKey,
    libraries: ["places"],
  });

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState("");
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const center = latitude && longitude ? { lat: latitude, lng: longitude } : { lat: centerLat, lng: centerLng };

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onPlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (place?.geometry?.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      onLocationChange(lat, lng);
      mapRef.current?.setCenter({ lat, lng });
      mapRef.current?.setZoom(16);
      setQuery(place.name || place.formatted_address || "");
    }
  };

  const locateMe = () => {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setUserLocation({ lat, lng, accuracy });
        onLocationChange(lat, lng);
        mapRef.current?.setCenter({ lat, lng });
        mapRef.current?.setZoom(16);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  if (!isLoaded) {
    return (
      <div className="h-64 w-full rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
        <span className="text-sm text-gray-400">Cargando mapa...</span>
      </div>
    );
  }

  return (
    <div className="relative h-64 w-full rounded-xl overflow-hidden border border-[var(--border)] shadow-sm">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={15}
        onLoad={onMapLoad}
        onClick={(e) => {
          if (e.latLng) onLocationChange(e.latLng.lat(), e.latLng.lng());
        }}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
        }}
      >
        {latitude && longitude && (
          <Marker position={{ lat: latitude, lng: longitude }} label="📍" />
        )}
        {userLocation && (
          <>
            <Marker
              position={{ lat: userLocation.lat, lng: userLocation.lng }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: "#3b82f6",
                fillOpacity: 1,
                strokeColor: "#fff",
                strokeWeight: 2,
              }}
            />
            <Circle
              center={{ lat: userLocation.lat, lng: userLocation.lng }}
              radius={userLocation.accuracy}
              options={{
                fillColor: "#3b82f6",
                fillOpacity: 0.08,
                strokeColor: "#3b82f6",
                strokeOpacity: 0.3,
                strokeWeight: 1.5,
              }}
            />
          </>
        )}
      </GoogleMap>

      {/* Top controls */}
      <div className="absolute top-2 left-2 right-2 flex items-start gap-2 z-10">
        <Autocomplete
          onLoad={(auto) => { autocompleteRef.current = auto; }}
          onPlaceChanged={onPlaceChanged}
          options={{ componentRestrictions: { country: "mx" }, fields: ["geometry", "name", "formatted_address"] }}
        >
          <div className="flex-1 flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 shadow-md border border-gray-200">
            <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar dirección..."
              className="w-full bg-transparent text-xs outline-none placeholder:text-gray-400"
            />
          </div>
        </Autocomplete>
        <button
          type="button"
          onClick={locateMe}
          disabled={locating}
          className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-all shrink-0"
        >
          <svg className={`h-3.5 w-3.5 ${locating ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {locating ? (
              <>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </>
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            )}
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {locating ? "Buscando..." : "Mi ubicación"}
        </button>
      </div>

      {/* Bottom hint */}
      <div className="absolute bottom-2 left-2 right-2 z-10">
        <div className="mx-auto w-fit rounded-full bg-white/80 backdrop-blur-sm px-3 py-1 text-[10px] text-gray-500 shadow-sm border border-gray-200/50">
          Haz clic en el mapa para colocar el marcador
        </div>
      </div>
    </div>
  );
}
