"use client";

import { useJsApiLoader, GoogleMap, Marker } from "@react-google-maps/api";

const containerStyle = { width: "100%", height: "100%" };

interface LocationViewerProps {
  latitude: number | null;
  longitude: number | null;
  height?: string;
  label?: string;
}

export default function LocationViewer({ latitude, longitude, height = "h-48", label }: LocationViewerProps) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script-viewer",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
  });

  if (!isLoaded) {
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
    <div className={`${height} w-full rounded-xl overflow-hidden border border-[var(--border)] shadow-sm relative`}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={{ lat: latitude, lng: longitude }}
        zoom={16}
        options={{
          scrollwheel: false,
          draggable: false,
          zoomControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          disableDefaultUI: true,
          styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
        }}
      >
        <Marker position={{ lat: latitude, lng: longitude }} />
      </GoogleMap>
      {label && (
        <div className="absolute bottom-2 left-2 right-2 z-10">
          <div className="mx-auto w-fit rounded-full bg-white/80 backdrop-blur-sm px-3 py-1 text-[10px] text-gray-500 shadow-sm border border-gray-200/50">
            {label}
          </div>
        </div>
      )}
    </div>
  );
}
