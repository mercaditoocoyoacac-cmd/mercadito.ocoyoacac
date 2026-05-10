"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";

const STEPS = ["Subir archivo", "Vista previa", "Resultado"];

function HelpTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-[color:var(--muted)] text-[10px] text-[color:var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        aria-label="Ayuda"
      >
        ?
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 mb-2 w-64 -translate-x-1/2 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs text-[color:var(--muted)] shadow-lg z-10">
          {text}
        </div>
      )}
    </span>
  );
}

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
          if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if ((ch === "," || ch === ";" || ch === "\t") && !inQuotes) {
          row.push(current.trim()); current = "";
        } else { current += ch; }
      }
      row.push(current.trim());
      allRows.push(row);
    }
    return allRows;
  }

  function normalizeHeader(h: string): string {
    return h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();
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

  function processRows(rows: string[][]) {
    const headers = rows[0];
    const nameIdx = findColumn(headers, ["nombre", "descripcion", "producto", "descrip", "articulo", "nombrearticulo"]);
    const priceIdx = findColumn(headers, ["precio", "preciovta", "precioventa", "precio1", "pvp", "venta"]);
    const skuIdx = findColumn(headers, ["sku", "codigo", "clave", "codigoproducto", "codigoarticulo", "codigobarras", "barcode"]);
    const stockIdx = findColumn(headers, ["existencia", "stock", "cantidad", "inventario", "existencias"]);

    if (nameIdx === null) {
      setError("No se encontró columna de nombre. Busca: nombre, descripción, producto, artículo.");
      return;
    }
    if (priceIdx === null) {
      setError("No se encontró columna de precio. Busca: precio, precioVta, precioVenta, PVP.");
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
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result;
      if (!data) { setError("No se pudo leer el archivo."); return; }

      // Handle Excel files
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        try {
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
          if (json.length < 2) { setError("El archivo necesita encabezados y al menos un producto."); return; }
          const rows = json as string[][];
          setCsvContent(rows.map(r => r.join(",")).join("\n"));
          processRows(rows);
        } catch {
          setError("No se pudo leer el archivo Excel. Asegúrate de que sea un archivo .xlsx válido.");
        }
        return;
      }

      // CSV files
      const text = data as string;
      setCsvContent(text);
      const rows = parseCSV(text);
      if (rows.length < 2) { setError("El CSV necesita encabezados y al menos un producto."); return; }
      processRows(rows);
    };

    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  }

  async function handleImport() {
    if (!csvContent) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vendor/products/import", { method: "POST", body: csvContent });
      const data = await res.json();
      if (!res.ok || !data.ok) { setError(data.error || "Error al importar."); return; }
      setSummary(data.summary);
      setResults(data.results?.slice(0, 50) || []);
      setImportErrors(data.errors || []);
      setStep("done");
    } catch { setError("Error de conexión al importar."); }
    finally { setLoading(false); }
  }

  function resetForm() {
    setFileName(null); setCsvContent(null); setSummary(null);
    setResults([]); setImportErrors([]); setPreviewRows([]);
    setError(null); setStep("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const stepIndex = step === "upload" ? 0 : step === "preview" ? 1 : 2;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Importar productos</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Sube tu catálogo desde SICAR u otro sistema
          </p>
        </div>
        <Link href="/vendor/productos" className="text-sm text-[var(--accent)] hover:underline">
          ← Volver
        </Link>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                i < stepIndex ? "bg-green-500 text-white" : i === stepIndex ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-[color:var(--muted)]"
              }`}>
                {i < stepIndex ? (
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : i + 1}
              </div>
              <span className={`text-xs sm:text-sm ${i === stepIndex ? "font-medium" : "text-[color:var(--muted)]"}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`mx-2 h-px w-8 sm:w-16 ${i < stepIndex ? "bg-green-500" : "bg-[var(--border)]"}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {step === "upload" && (
        <>
          <div className="rounded-xl border border-[var(--border)] bg-white p-6">
            <h2 className="font-semibold">¿Cómo funciona?</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">1</div>
                <div>
                  <div className="font-medium">Exporta desde SICAR</div>
                  <p className="text-[color:var(--muted)] mt-0.5">En SICAR ve a Archivo → Exportar → CSV. También puedes usar Excel (.xlsx).</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">2</div>
                <div>
                  <div className="font-medium">Sube el archivo aquí</div>
                  <p className="text-[color:var(--muted)] mt-0.5">Arrastra o haz clic para seleccionar tu archivo CSV o Excel.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">3</div>
                <div>
                  <div className="font-medium">Revisa y confirma</div>
                  <p className="text-[color:var(--muted)] mt-0.5">Verás una vista previa antes de importar. Productos nuevos se crearán, existentes se actualizarán.</p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-[var(--accent-soft)]/50 p-4">
              <h3 className="text-sm font-medium">Columnas que detectamos automáticamente
                <HelpTip text="No importa el orden ni el nombre exacto. Buscamos palabras clave en los encabezados de tu archivo." />
              </h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 text-xs text-[color:var(--muted)]">
                <div><span className="font-medium text-gray-700">Producto:</span> nombre, descripción, artículo</div>
                <div><span className="font-medium text-gray-700">Precio:</span> precio, precioVta, PVP</div>
                <div><span className="font-medium text-gray-700">Código:</span> SKU, código, clave, códigoBarras</div>
                <div><span className="font-medium text-gray-700">Inventario:</span> existencia, stock, cantidad</div>
              </div>
            </div>
          </div>

          <div
            className="rounded-xl border-2 border-dashed border-[var(--border)] bg-white p-12 text-center cursor-pointer hover:border-[var(--accent)] transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)]">
              <svg className="h-8 w-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-medium">Arrastra tu archivo aquí o haz clic para seleccionar</p>
            <p className="mt-1 text-xs text-[color:var(--muted)]">CSV (SICAR) o Excel (.xlsx)</p>
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
              <button onClick={resetForm} className="text-sm text-[var(--accent)] hover:underline">
                Cambiar archivo
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {previewRows.map((row, i) => (
                <div key={i} className="rounded-lg border border-[var(--border)] bg-gray-50 p-3">
                  <div className="font-medium text-sm truncate">{row.name}</div>
                  <div className="mt-1 text-lg font-semibold text-[var(--accent)]">{row.price}</div>
                  <div className="mt-1 flex gap-2 text-xs text-[color:var(--muted)]">
                    {row.sku && <span className="font-mono">#{row.sku}</span>}
                    {row.stock && <span>{row.stock} uds</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={handleImport} disabled={loading}
                className="flex-1 rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? "Importando..." : `Importar productos`}
              </button>
              <button onClick={resetForm} className="rounded-lg border border-[var(--border)] px-6 py-3">
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}

      {step === "done" && summary && (
        <>
          <div className="rounded-xl border border-[var(--border)] bg-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-lg">Importación completada</h2>
                <p className="text-sm text-[color:var(--muted)]">{fileName}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-green-50 p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{summary.created}</div>
                <div className="text-sm text-green-700">Nuevos</div>
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
              <h3 className="font-semibold text-red-700">Errores</h3>
              <div className="mt-3 space-y-1 text-sm">
                {importErrors.map((err, i) => (
                  <p key={i} className="text-red-600">Fila {err.row}: {err.error}</p>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-white p-6">
              <h3 className="font-semibold">Productos procesados ({results.length})</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {results.slice(0, 30).map((r, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                    <span className={`inline-flex h-2 w-2 shrink-0 rounded-full ${
                      r.action === "created" ? "bg-green-500" : "bg-blue-500"
                    }`} />
                    <span className="truncate flex-1">{r.name}</span>
                    <span className="text-xs text-[color:var(--muted)]">{r.price ? `$${(r.price / 100).toFixed(2)}` : ""}</span>
                  </div>
                ))}
              </div>
              {results.length > 30 && (
                <p className="mt-2 text-xs text-[color:var(--muted)]">Mostrando 30 de {results.length}</p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Link href="/vendor/productos"
              className="flex-1 rounded-lg bg-[var(--accent)] px-6 py-3 text-center font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
              Ver productos
            </Link>
            <button onClick={resetForm} className="rounded-lg border border-[var(--border)] px-6 py-3">
              Importar otro
            </button>
          </div>
        </>
      )}
    </div>
  );
}
