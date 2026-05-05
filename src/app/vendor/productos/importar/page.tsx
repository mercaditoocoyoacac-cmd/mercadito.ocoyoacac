"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export default function VendorImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ created: number; updated: number; skipped: number; errors: number } | null>(null);
  const [results, setResults] = useState<{ action: string; name: string; price?: number; stock?: number }[]>([]);
  const [importErrors, setImportErrors] = useState<{ row: number; error: string }[]>([]);
  const [previewRows, setPreviewRows] = useState<{ name: string; price: string; sku?: string; stock?: string }[]>([]);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");

  function parseCSV(text: string) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];

    const allRows: string[][] = [];
    for (const line of lines) {
      const row: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if ((ch === "," || ch === ";" || ch === "\t") && !inQuotes) {
          row.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
      row.push(current.trim());
      allRows.push(row);
    }
    return allRows;
  }

  function normalizeHeader(h: string): string {
    return h
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }

  function findColumn(headers: string[], candidates: string[]): number | null {
    for (let i = 0; i < headers.length; i++) {
      const norm = normalizeHeader(headers[i]);
      if (candidates.some((c) => norm.includes(c))) return i;
    }
    return null;
  }

  function parsePrice(val: string): string {
    const cleaned = val.replace(/[$, ]/g, "").replace(/,/g, ".");
    const num = parseFloat(cleaned);
    if (isNaN(num) || num <= 0) return "-";
    return `$${num.toFixed(2)}`;
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv") && !file.type.includes("csv") && !file.type.includes("text")) {
      setError("Solo se aceptan archivos CSV.");
      return;
    }

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvContent(text);

      const rows = parseCSV(text);
      if (rows.length < 2) {
        setError("El CSV necesita encabezados y al menos un producto.");
        return;
      }

      const headers = rows[0];
      const nameIdx = findColumn(headers, ["nombre", "descripcion", "producto", "descrip", "articulo", "nombrearticulo"]);
      const priceIdx = findColumn(headers, ["precio", "preciovta", "precioventa", "precio1", "pvp", "venta"]);
      const skuIdx = findColumn(headers, ["sku", "codigo", "clave", "codigoproducto", "codigoarticulo", "codigobarras", "barcode"]);
      const stockIdx = findColumn(headers, ["existencia", "stock", "cantidad", "inventario", "existencias"]);

      if (nameIdx === null) {
        setError("No se encontro columna de nombre. Busca: nombre, descripcion, producto, articulo.");
        return;
      }
      if (priceIdx === null) {
        setError("No se encontro columna de precio. Busca: precio, preciovta, precioventa, pvp.");
        return;
      }

      const preview: { name: string; price: string; sku?: string; stock?: string }[] = [];
      for (let i = 1; i < Math.min(rows.length, 11); i++) {
        const row = rows[i];
        if (!row[nameIdx] || row[nameIdx].trim() === "") continue;
        preview.push({
          name: row[nameIdx].trim(),
          price: parsePrice(row[priceIdx]),
          sku: skuIdx !== null ? row[skuIdx]?.trim() : undefined,
          stock: stockIdx !== null ? row[stockIdx]?.trim() : undefined,
        });
      }
      setPreviewRows(preview);
      setStep("preview");
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!csvContent) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/vendor/products/import", {
        method: "POST",
        body: csvContent,
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "Error al importar productos.");
        return;
      }

      setSummary(data.summary);
      setResults(data.results?.slice(0, 50) || []);
      setImportErrors(data.errors || []);
      setStep("done");
    } catch {
      setError("Error de conexion al importar.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFileName(null);
    setCsvContent(null);
    setSummary(null);
    setResults([]);
    setImportErrors([]);
    setPreviewRows([]);
    setError(null);
    setStep("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Importar productos</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Sincroniza tu catalogo desde SICAR u otro sistema
          </p>
        </div>
        <Link
          href="/vendor/productos"
          className="text-sm text-[color:var(--accent)] hover:underline"
        >
          ← Volver a productos
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === "upload" && (
        <>
          <div className="rounded-xl border border-[var(--border)] bg-white p-6">
            <h2 className="font-semibold">Como funciona</h2>
            <div className="mt-3 space-y-2 text-sm text-[color:var(--muted)]">
              <p>1. Exporta tus productos desde <strong>SICAR</strong> como CSV (Archivo → Exportar → CSV)</p>
              <p>2. Sube el archivo aqui</p>
              <p>3. Revisa la vista previa y confirma la importacion</p>
            </div>
            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <h3 className="text-sm font-medium">Columnas que detectamos automaticamente:</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 text-xs text-[color:var(--muted)]">
                <div><strong>Nombre:</strong> nombre, descripcion, producto, articulo</div>
                <div><strong>Precio:</strong> precio, preciovta, precioventa, pvp</div>
                <div><strong>SKU:</strong> sku, codigo, clave, codigobarras</div>
                <div><strong>Existencia:</strong> existencia, stock, cantidad, inventario</div>
              </div>
              <p className="mt-3 text-xs text-[color:var(--muted)]">
                Los productos se actualizan por <strong>SKU</strong> o por <strong>nombre exacto</strong>. 
                Si el SKU existe, se actualiza. Si no, se busca por nombre. 
                Si no existe ninguno, se crea un producto nuevo.
              </p>
            </div>
          </div>

          <div
            className="rounded-xl border-2 border-dashed border-[var(--border)] bg-white p-12 text-center cursor-pointer hover:border-[var(--accent)] transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <svg className="mx-auto h-12 w-12 text-[color:var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3" />
            </svg>
            <p className="mt-4 text-sm font-medium">Arrastra tu archivo CSV o haz clic para seleccionar</p>
            <p className="mt-1 text-xs text-[color:var(--muted)]">Solo archivos CSV exportados desde SICAR u otro POS</p>
          </div>
        </>
      )}

      {step === "preview" && (
        <>
          <div className="rounded-xl border border-[var(--border)] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Vista previa: {fileName}</h2>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  Mostrando los primeros {previewRows.length} productos
                </p>
              </div>
              <button
                onClick={resetForm}
                className="text-sm text-[color:var(--muted)] hover:text-gray-900"
              >
                Cambiar archivo
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-xs font-medium text-[color:var(--muted)]">Producto</th>
                    <th className="px-4 py-2 text-xs font-medium text-[color:var(--muted)]">Precio</th>
                    <th className="px-4 py-2 text-xs font-medium text-[color:var(--muted)]">SKU</th>
                    <th className="px-4 py-2 text-xs font-medium text-[color:var(--muted)]">Existencia</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-t border-[var(--border)]">
                      <td className="px-4 py-2">{row.name}</td>
                      <td className="px-4 py-2 font-medium">{row.price}</td>
                      <td className="px-4 py-2 font-mono text-xs">{row.sku || "-"}</td>
                      <td className="px-4 py-2">{row.stock ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex-1 rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? "Importando..." : `Importar ${previewRows.length > 0 ? `${previewRows.length}+` : "productos"}`}
              </button>
              <button
                onClick={resetForm}
                className="rounded-lg border border-[var(--border)] px-6 py-3"
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}

      {step === "done" && summary && (
        <>
          <div className="rounded-xl border border-[var(--border)] bg-white p-6">
            <h2 className="font-semibold">Importacion completada</h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-green-50 p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{summary.created}</div>
                <div className="text-sm text-green-700">Nuevos productos</div>
              </div>
              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.updated}</div>
                <div className="text-sm text-blue-700">Actualizados</div>
              </div>
              <div className="rounded-lg bg-red-50 p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{summary.errors}</div>
                <div className="text-sm text-red-700">Errores</div>
              </div>
            </div>
          </div>

          {importErrors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-white p-6">
              <h3 className="font-semibold text-red-700">Errores de importacion</h3>
              <div className="mt-3 space-y-1 text-sm">
                {importErrors.map((err, i) => (
                  <p key={i} className="text-red-600">
                    Fila {err.row}: {err.error}
                  </p>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-white p-6">
              <h3 className="font-semibold">Productos procesados</h3>
              <div className="mt-3 overflow-hidden rounded-lg border border-[var(--border)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-xs font-medium text-[color:var(--muted)]">Accion</th>
                      <th className="px-4 py-2 text-xs font-medium text-[color:var(--muted)]">Producto</th>
                      <th className="px-4 py-2 text-xs font-medium text-[color:var(--muted)]">Precio</th>
                      <th className="px-4 py-2 text-xs font-medium text-[color:var(--muted)]">Existencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.slice(0, 30).map((r, i) => (
                      <tr key={i} className="border-t border-[var(--border)]">
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              r.action === "created"
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {r.action === "created" ? "Nuevo" : "Actualizado"}
                          </span>
                        </td>
                        <td className="px-4 py-2">{r.name}</td>
                        <td className="px-4 py-2">{r.price ? `$${(r.price / 100).toFixed(2)}` : "-"}</td>
                        <td className="px-4 py-2">{r.stock ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {results.length > 30 && (
                  <p className="mt-2 text-xs text-[color:var(--muted)]">
                    Mostrando 30 de {results.length} productos
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Link
              href="/vendor/productos"
              className="flex-1 rounded-lg bg-[var(--accent)] px-6 py-3 text-center font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
              Ver productos
            </Link>
            <button
              onClick={resetForm}
              className="rounded-lg border border-[var(--border)] px-6 py-3"
            >
              Importar otro archivo
            </button>
          </div>
        </>
      )}
    </div>
  );
}
