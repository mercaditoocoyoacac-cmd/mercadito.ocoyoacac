"use client";

import { useEffect, useState } from "react";

interface Category {
  id: string;
  key: string;
  label: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

export default function AdminCategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState("🏪");
  const [newSortOrder, setNewSortOrder] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editSortOrder, setEditSortOrder] = useState(0);

  async function fetchCategories() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      if (data.ok) setCategories(data.categories);
      else setError(data.error || "Error al cargar");
    } catch {
      setError("Error de red");
    }
    setLoading(false);
  }

  useEffect(() => { fetchCategories(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey || !newLabel) return;
    setError(null);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: newKey, label: newLabel, icon: newIcon, sortOrder: newSortOrder }),
    });
    const data = await res.json();
    if (data.ok) {
      setNewKey(""); setNewLabel(""); setNewIcon("🏪"); setNewSortOrder(categories.length);
      fetchCategories();
    } else {
      setError(data.error || "Error al crear");
    }
  }

  async function handleUpdate(id: string) {
    if (!editLabel) return;
    setError(null);
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: editLabel, icon: editIcon, sortOrder: editSortOrder }),
    });
    const data = await res.json();
    if (data.ok) {
      setEditingId(null);
      fetchCategories();
    } else {
      setError(data.error || "Error al actualizar");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta categoría?")) return;
    setError(null);
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) {
      fetchCategories();
    } else {
      setError(data.error || "Error al eliminar");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categorías de tiendas</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Administra las clasificaciones disponibles para las tiendas.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* Create form */}
      <form onSubmit={handleCreate} className="rounded-xl border border-[var(--border)] p-4 space-y-3">
        <h2 className="text-sm font-semibold">Nueva categoría</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input value={newKey} onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))} placeholder="Clave (ej. ROPA)" required
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
          <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Nombre (ej. Ropa y accesorios)" required
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
          <input value={newIcon} onChange={(e) => setNewIcon(e.target.value)} placeholder="Icono (ej. 👕)"
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
          <input type="number" value={newSortOrder} onChange={(e) => setNewSortOrder(parseInt(e.target.value) || 0)} placeholder="Orden"
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
        </div>
        <button type="submit" className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]">
          Crear categoría
        </button>
      </form>

      {/* Categories list */}
      {loading ? (
        <div className="text-center py-8 text-sm text-[color:var(--muted)]">Cargando...</div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] p-8 text-center text-sm text-[color:var(--muted)]">
          No hay categorías creadas
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="rounded-xl border border-[var(--border)] p-4">
              {editingId === cat.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
                      className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
                    <input value={editIcon} onChange={(e) => setEditIcon(e.target.value)}
                      className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
                    <input type="number" value={editSortOrder} onChange={(e) => setEditSortOrder(parseInt(e.target.value) || 0)}
                      className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(cat.id)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                      Guardar
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--accent-soft)]">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.icon}</span>
                    <div>
                      <div className="font-medium text-sm">{cat.label}</div>
                      <div className="text-xs text-[color:var(--muted)]">Clave: {cat.key} · Orden: {cat.sortOrder} · {cat.isActive ? "Activa" : "Inactiva"}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingId(cat.id); setEditLabel(cat.label); setEditIcon(cat.icon); setEditSortOrder(cat.sortOrder); }}
                      className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--accent-soft)]">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(cat.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50">
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
