import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser } from "@/server/requireUser";

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const result: string[][] = [];
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
    result.push(row);
  }
  return result;
}

function detectDelimiter(headers: string[]): string {
  const firstLine = headers.join("");
  if (firstLine.includes("\t")) return "\t";
  if (headers.some((h) => h.includes(";"))) return ";";
  return ",";
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

function parsePrice(val: string): number | null {
  const cleaned = val.replace(/[$, ]/g, "").replace(/,/g, ".");
  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return null;
  return Math.round(num * 100);
}

function parseStock(val: string): number | null {
  const cleaned = val.replace(/,/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num) || num < 0) return null;
  return Math.floor(num);
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const store = await prisma.store.findFirst({
    where: { ownerId: auth.userId },
    select: { id: true },
  });

  if (!store) {
    return NextResponse.json({ ok: false, error: "No tienes tienda registrada." }, { status: 400 });
  }

  const text = await req.text();
  if (!text || text.length < 10) {
    return NextResponse.json({ ok: false, error: "El archivo CSV esta vacio." }, { status: 400 });
  }

  const rows = parseCSV(text);
  if (rows.length < 2) {
    return NextResponse.json({ ok: false, error: "El CSV necesita encabezados y al menos un producto." }, { status: 400 });
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const nameIdx = findColumn(headers, ["nombre", "descripcion", "producto", "descrip", "articulo", "nombrearticulo"]);
  const priceIdx = findColumn(headers, ["precio", "preciovta", "precioventa", "precio1", "pvp", "venta"]);
  const skuIdx = findColumn(headers, ["sku", "codigo", "clave", "codigoproducto", "codigoarticulo", "codigobarras", "barcode", "ean", "upc"]);
  const stockIdx = findColumn(headers, ["existencia", "stock", "cantidad", "inventario", "existencias"]);

  if (nameIdx === null) {
    return NextResponse.json(
      {
        ok: false,
        error: "No se encontro columna de nombre. El CSV debe tener una columna con: nombre, descripcion, producto, o articulo.",
      },
      { status: 400 }
    );
  }

  if (priceIdx === null) {
    return NextResponse.json(
      {
        ok: false,
        error: "No se encontro columna de precio. El CSV debe tener una columna con: precio, preciovta, precioventa, o pvp.",
      },
      { status: 400 }
    );
  }

  const existingBySku: Record<string, { id: string; name: string }> = {};
  const existingByName: Record<string, { id: string; sku: string | null }> = {};

  if (skuIdx !== null) {
    const products = await prisma.product.findMany({
      where: { storeId: store.id, sku: { not: null } },
      select: { id: true, name: true, sku: true },
    });
    for (const p of products) {
      if (p.sku) existingBySku[p.sku] = { id: p.id, name: p.name };
    }
  }

  const allProducts = await prisma.product.findMany({
    where: { storeId: store.id },
    select: { id: true, name: true, sku: true },
  });
  for (const p of allProducts) {
    existingByName[p.name.toLowerCase()] = { id: p.id, sku: p.sku };
  }

  const results: { action: "created" | "updated" | "skipped"; name: string; sku?: string; price?: number; stock?: number }[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row[nameIdx] || row[nameIdx].trim() === "") continue;

    const name = row[nameIdx].trim();
    const priceCents = parsePrice(row[priceIdx]);
    const sku = skuIdx !== null ? row[skuIdx]?.trim() : null;
    const stock = stockIdx !== null ? parseStock(row[stockIdx]) : null;

    if (!priceCents) {
      errors.push({ row: i + 2, error: `Precio invalido en "${name}"` });
      continue;
    }

    if (sku && existingBySku[sku]) {
      await prisma.product.update({
        where: { id: existingBySku[sku].id },
        data: {
          name,
          priceCents,
          stock: stock !== null ? stock : undefined,
          barcode: sku || undefined,
          updatedAt: new Date(),
        },
      });
      results.push({ action: "updated", name, sku, price: priceCents, stock: stock ?? undefined });
    } else if (existingByName[name.toLowerCase()]) {
      const existing = existingByName[name.toLowerCase()];
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          priceCents,
          stock: stock !== null ? stock : undefined,
          sku: sku || existing.sku || undefined,
          barcode: sku || undefined,
          updatedAt: new Date(),
        },
      });
      results.push({ action: "updated", name, sku: sku || undefined, price: priceCents, stock: stock ?? undefined });
    } else {
      await prisma.product.create({
        data: {
          storeId: store.id,
          name,
          priceCents,
          sku: sku || undefined,
          barcode: sku || undefined,
          stock: stock !== null ? stock : -1,
          isActive: true,
        },
      });
      results.push({ action: "created", name, sku: sku || undefined, price: priceCents, stock: stock ?? undefined });
    }
  }

  const summary = {
    created: results.filter((r) => r.action === "created").length,
    updated: results.filter((r) => r.action === "updated").length,
    skipped: results.filter((r) => r.action === "skipped").length,
    errors: errors.length,
  };

  return NextResponse.json({
    ok: true,
    summary,
    results,
    errors: errors.slice(0, 20),
  });
}
