"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useJsApiLoader, GoogleMap, Polygon, Marker, Polyline } from "@react-google-maps/api";
import { formatMoney } from "@/lib/format";

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";
const containerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 19.2886, lng: -99.4498 };

interface Zone {
  id: string;
  name: string;
  color: string;
  priceCents: number;
  polygon: { lat: number; lng: number }[];
  isActive: boolean;
  sortOrder: number;
}

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];

export default function ZonasEnvioPage() {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script-zones",
    googleMapsApiKey: apiKey,
    libraries: [],
  });

  const [zones, setZones] = useState<Zone[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [editingZone, setEditingZone] = useState<Partial<Zone> | null>(null);
  const [editingPolygon, setEditingPolygon] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const draggingRef = useRef<number | null>(null);

  const loadZones = useCallback(async () => {
    const res = await fetch("/api/admin/delivery-zones");
    const data = await res.json();
    if (data.ok) setZones(data.zones);
  }, []);

  useEffect(() => { loadZones(); }, [loadZones]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapReady(true);
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapReady || !mapRef.current || (!drawing && !editingPolygon)) return;
    const map = mapRef.current;
    const listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      const lat = e.latLng?.lat();
      const lng = e.latLng?.lng();
      if (lat == null || lng == null) return;
      if (drawing) {
        setDrawPoints((prev) => [...prev, { lat, lng }]);
      } else if (editingPolygon && editingZone?.id) {
        setEditingZone((prev) => {
          const current = prev?.polygon ? [...prev.polygon] : [];
          if (current.some((p) => Math.abs(p.lat - lat) < 0.00001 && Math.abs(p.lng - lng) < 0.00001)) return prev;
          current.push({ lat, lng });
          return { ...prev!, polygon: current };
        });
      }
    });
    clickListenerRef.current = listener;
    return () => {
      google.maps.event.removeListener(listener);
      clickListenerRef.current = null;
    };
  }, [isLoaded, mapReady, drawing, editingPolygon, editingZone?.id]);

  function startDrawing() {
    setDrawPoints([]);
    setDrawing(true);
    setEditingPolygon(false);
    setEditingZone(null);
  }

  function cancelDrawing() {
    setDrawing(false);
    setDrawPoints([]);
    if (clickListenerRef.current) {
      google.maps.event.removeListener(clickListenerRef.current);
      clickListenerRef.current = null;
    }
  }

  function finishDrawing() {
    if (drawPoints.length < 3) return;
    setDrawing(false);
    if (clickListenerRef.current) {
      google.maps.event.removeListener(clickListenerRef.current);
      clickListenerRef.current = null;
    }
    const newZone: Partial<Zone> = {
      name: "",
      color: COLORS[zones.length % COLORS.length],
      priceCents: 2500,
      polygon: [...drawPoints],
      isActive: true,
    };
    setDrawPoints([]);
    setEditingZone(newZone);
  }

  function startPolygonEditing(zone: Zone) {
    setDrawing(false);
    setEditingPolygon(true);
    setSelectedZoneId(zone.id);
    setEditingZone({ ...zone, id: zone.id });
    if (mapRef.current && zone.polygon?.length) {
      const bounds = new google.maps.LatLngBounds();
      zone.polygon.forEach((p) => bounds.extend(p));
      mapRef.current.fitBounds(bounds, 50);
    }
  }

  function movePolygonPoint(index: number, lat: number, lng: number) {
    setEditingZone((prev) => {
      if (!prev?.polygon) return prev;
      const polygon = [...prev.polygon];
      polygon[index] = { lat, lng };
      return { ...prev, polygon };
    });
  }

  function deletePolygonPoint(index: number) {
    setEditingZone((prev) => {
      if (!prev?.polygon) return prev;
      const polygon = prev.polygon.filter((_, i) => i !== index);
      return { ...prev, polygon };
    });
  }

  const centerZone = useCallback((zone: Zone) => {
    if (!mapRef.current || !zone.polygon?.length) return;
    const bounds = new google.maps.LatLngBounds();
    zone.polygon.forEach((p) => bounds.extend(p));
    mapRef.current.fitBounds(bounds, 50);
    setSelectedZoneId(zone.id);
    setEditingZone(null);
  }, []);

  async function saveZone() {
    if (!editingZone?.polygon?.length || !editingZone.name) return;
    setSaving(true);
    const body = {
      name: editingZone.name,
      color: editingZone.color,
      priceCents: editingZone.priceCents,
      polygon: editingZone.polygon,
      isActive: editingZone.isActive ?? true,
    };

    if ((editingZone as any).id) {
      await fetch(`/api/admin/delivery-zones/${(editingZone as any).id}`, {
        method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/admin/delivery-zones", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
    }
    setSaving(false);
    setEditingZone(null);
    setEditingPolygon(false);
    loadZones();
  }

  async function deleteZone(id: string) {
    if (!confirm("¿Eliminar esta zona de envío?")) return;
    await fetch(`/api/admin/delivery-zones/${id}`, { method: "DELETE" });
    setSelectedZoneId(null);
    loadZones();
  }

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Zonas de envío</h1>
        <div className="h-[600px] rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
          <span className="text-sm text-gray-400">Cargando mapa...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Zonas de envío</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Define zonas geográficas con costo de envío personalizado.
          </p>
        </div>
        <div className="flex gap-2">
          {drawing ? (
            <>
              <button
                type="button"
                onClick={cancelDrawing}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
              >
                Cancelar dibujo
              </button>
              <button
                type="button"
                onClick={finishDrawing}
                disabled={drawPoints.length < 3}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
              >
                Completar polígono ({drawPoints.length} pts)
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startDrawing}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
            >
              Dibujar nueva zona
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="order-2 space-y-3 lg:order-1">
          {zones.length === 0 && !editingZone && (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[color:var(--muted)]">
              No hay zonas definidas. Haz clic en "Dibujar nueva zona" para comenzar.
            </div>
          )}

          {zones
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((zone) => (
              <div
                key={zone.id}
                onClick={() => centerZone(zone)}
                className={`cursor-pointer rounded-xl border p-4 transition-all hover:shadow-sm ${
                  selectedZoneId === zone.id ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-[var(--border)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border border-white/50 shadow-sm" style={{ backgroundColor: zone.color }} />
                    <span className="font-medium text-sm">{zone.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--accent)]">{formatMoney(zone.priceCents, "MXN")}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startPolygonEditing(zone);
                      }}
                      className="rounded p-1 text-[color:var(--muted)] hover:bg-gray-100"
                      title="Editar polígono de la zona"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteZone(zone.id);
                      }}
                      className="rounded p-1 text-red-400 hover:bg-red-50"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}

          {drawing && (
            <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm text-blue-700">
              Haz clic en el mapa para agregar puntos al polígono. Mínimo 3 puntos.
            </div>
          )}

          {editingZone && (
            <div className="rounded-xl border border-[var(--accent)] bg-blue-50/50 p-4 space-y-3">
              <div className="text-sm font-medium">{editingZone.id ? "Editar zona" : "Nueva zona"}</div>
              <input
                type="text"
                placeholder="Nombre de la zona"
                value={editingZone.name}
                onChange={(e) => setEditingZone({ ...editingZone, name: e.target.value })}
                className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-[color:var(--muted)] mb-1">Color</div>
                  <div className="flex flex-wrap gap-1">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditingZone({ ...editingZone, color: c })}
                        className={`h-6 w-6 rounded-full border-2 transition-all ${editingZone.color === c ? "border-gray-800 scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[color:var(--muted)] mb-1">Costo de envío</div>
                  <input
                    type="number"
                    min={0}
                    value={Math.round((editingZone.priceCents ?? 2500) / 100)}
                    onChange={(e) => setEditingZone({ ...editingZone, priceCents: parseInt(e.target.value || "0") * 100 })}
                    className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>
              {!editingZone.polygon?.length && (
                <p className="text-xs text-amber-600">Dibuja un polígono en el mapa para definir la zona.</p>
              )}

              {editingZone.id && (
                <div className="rounded-lg border border-[var(--border)] bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium">
                      Polígono · {editingZone.polygon?.length ?? 0} puntos
                    </div>
                    {editingPolygon ? (
                      <button
                        type="button"
                        onClick={() => setEditingPolygon(false)}
                        className="rounded-md bg-gray-200 px-2 py-1 text-xs font-medium hover:bg-gray-300 transition-colors"
                      >
                        Terminar edición
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingPolygon(true)}
                        className="rounded-md bg-[var(--accent)] px-2 py-1 text-xs font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
                      >
                        Editar polígono
                      </button>
                    )}
                  </div>
                  {editingPolygon && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-[color:var(--muted)]">
                        Haz clic en el mapa para agregar un punto. Arrastra un punto para moverlo. Haz clic sobre un punto para eliminarlo.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingPolygon(false)}
                          className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingZone({ ...editingZone, polygon: editingZone.polygon?.slice(0, -1) ?? [] })}
                          disabled={!editingZone.polygon?.length}
                          className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-40"
                        >
                          Deshacer último punto
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setEditingZone(null); setEditingPolygon(false); }}
                  className="flex-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveZone}
                  disabled={saving || !editingZone.name || !editingZone.polygon?.length}
                  className="flex-1 rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-[var(--border)] p-4 space-y-2">
            <div className="text-sm font-medium">Leyenda</div>
            {zones.length === 0 && (
              <div className="text-xs text-[color:var(--muted)]">Aún no hay zonas.</div>
            )}
            {zones.sort((a, b) => a.priceCents - b.priceCents).map((zone) => (
              <div key={zone.id} className="flex items-center gap-2 text-sm">
                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: zone.color }} />
                <span className="flex-1">{zone.name}</span>
                <span className="font-medium text-xs">{formatMoney(zone.priceCents, "MXN")}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="order-1 h-[600px] overflow-hidden rounded-xl border border-[var(--border)] shadow-sm lg:order-2 lg:col-span-2">
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={defaultCenter}
            zoom={13}
            onLoad={onMapLoad}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
            }}
          >
            {zones
              .filter((z) => z.polygon?.length > 0)
              .filter((z) => !(editingPolygon && editingZone?.id === z.id))
              .map((zone) => (
                <Polygon
                  key={zone.id}
                  paths={zone.polygon}
                  options={{
                    fillColor: zone.color,
                    fillOpacity: selectedZoneId === zone.id ? 0.45 : 0.25,
                    strokeColor: zone.color,
                    strokeWeight: selectedZoneId === zone.id ? 3 : 2,
                    clickable: true,
                  }}
                  onClick={() => centerZone(zone)}
                />
              ))}
            {drawing && drawPoints.length > 0 && (
              <>
                <Polyline
                  path={drawPoints}
                  options={{
                    strokeColor: "#22c55e",
                    strokeWeight: 2,
                    strokeOpacity: 0.8,
                  }}
                />
                {drawPoints.map((p, i) => (
                  <Marker
                    key={i}
                    position={p}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 6,
                      fillColor: "#22c55e",
                      fillOpacity: 1,
                      strokeColor: "#fff",
                      strokeWeight: 2,
                    }}
                    label={{
                      text: `${i + 1}`,
                      color: "#fff",
                      fontSize: "10px",
                    }}
                  />
                ))}
              </>
            )}

            {editingPolygon && editingZone?.polygon && editingZone.polygon.length >= 3 && (
              <>
                <Polygon
                  paths={editingZone.polygon}
                  options={{
                    fillColor: editingZone.color || "#22c55e",
                    fillOpacity: 0.2,
                    strokeColor: editingZone.color || "#22c55e",
                    strokeWeight: 2.5,
                    clickable: false,
                  }}
                />
                <Polyline
                  path={[...editingZone.polygon, editingZone.polygon[0]]}
                  options={{
                    strokeColor: editingZone.color || "#22c55e",
                    strokeWeight: 2.5,
                    strokeOpacity: 0.9,
                  }}
                />
                {editingZone.polygon.map((p, i) => (
                  <Marker
                    key={`${p.lat}-${p.lng}-${i}`}
                    position={p}
                    draggable
                    onDragStart={() => { draggingRef.current = i; }}
                    onDragEnd={(e) => {
                      const lat = e.latLng?.lat();
                      const lng = e.latLng?.lng();
                      const idx = draggingRef.current;
                      draggingRef.current = null;
                      if (lat != null && lng != null && idx != null) {
                        movePolygonPoint(idx, lat, lng);
                      }
                    }}
                    onClick={() => {
                      const idx = draggingRef.current;
                      if (idx != null) return;
                      if ((editingZone.polygon?.length ?? 0) <= 3) {
                        alert("Una zona necesita al menos 3 puntos.");
                        return;
                      }
                      deletePolygonPoint(i);
                    }}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 7,
                      fillColor: editingZone.color || "#22c55e",
                      fillOpacity: 1,
                      strokeColor: "#fff",
                      strokeWeight: 2.5,
                    }}
                    label={{
                      text: `${i + 1}`,
                      color: "#fff",
                      fontSize: "10px",
                    }}
                  />
                ))}
              </>
            )}
          </GoogleMap>
        </div>
      </div>
    </div>
  );
}
