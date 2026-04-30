import PDFDocument from "pdfkit";
import { prisma } from "@/server/prisma";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function generateId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const { storeId } = json || {};

  if (!storeId) {
    return Response.json({ ok: false, error: "Store ID requerido" }, { status: 400 });
  }

  const store = await prisma.store.findFirst({
    where: { id: storeId },
    include: { owner: true, subscription: true },
  });

  if (!store) {
    return Response.json({ ok: false, error: "Tienda no encontrada" }, { status: 404 });
  }

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const userAgent = headersList.get("user-agent") || "unknown";

  const today = new Date();
  const contractId = generateId();
  const fecha = today.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const contractTerms = `
CONTRATO DE PRESTACIÓN DE SERVICIOS DE COMERCIO ELECTRÓNICO

CONTRATO No. ${contractId}
Fecha: ${fecha}

PRESTADOR: Mercadito - Plataforma de comercio electrónico
Dirección: Ocoyoacac, Estado de México
CLIENTE: ${store.name}
Propietario: ${store.owner.name || "No especificado"}
Email: ${store.owner.email}
Teléfono: ${store.phone || "No especificado"}

OBJETO DEL CONTRATO:
El Prestador otorga al Cliente acceso a la plataforma Mercadito para la gestión de ventas en línea, incluyendo:
- Tienda virtual personalizada
- Gestión de productos y pedidos
- Sistema de pagos en línea (MercadoPago)
- Panel de administración
- Soporte técnico básico

COSTO DEL SERVICIO:
El Cliente se compromete a pagar la cantidad de $496.00 MXN (IVA incluido) de manera mensual.

PLAZO:
El contrato tendrá vigencia de un mes calendario, renovándose automáticamente.

AUTORIZACIÓN DE DATOS:
El Cliente autoriza expresamente a Mercadito a utilizar su información comercial (nombre de tienda, 
dirección, teléfono, descripción) para fines de operación de la plataforma, incluyendo:
- Mostrar datos de contacto en la tienda virtual
- Procesar pedidos y entregas
- Comunicación con clientes
- Integración con MercadoPago

LIMITACIÓN DE RESPONSABILIDAD:
El Prestador NO se hace responsable por:
- Uso indebido de la información pública del vendedor por parte de terceros
- Disputas entre vendedores y clientes
- Pérdidas derivadas del uso de la plataforma

La responsabilidad máxima del Prestador no excederá el monto pagado por el servicio en el mes correspondiente.

ACEPTACIÓN:
Al firmar este documento, el Cliente acepta los términos y condiciones establecidos.

DATOS DEL FIRMANTE:
Nombre: ${store.owner.name || "No especificado"}
IP: ${ip}
Navegador: ${userAgent.substring(0, 50)}
Fecha de aceptación: ${fecha}
`;

  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  const base64Pdf = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text("CONTRATO DE PRESTACIÓN DE SERVICIOS", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Contrato No. ${contractId}`);
    doc.text(`Fecha: ${fecha}`);
    doc.moveDown();
    doc.fontSize(12).text("PRESTADOR:");
    doc.text("Mercadito - Plataforma de comercio electrónico");
    doc.text("Ocoyoacac, Estado de México");
    doc.moveDown();
    doc.fontSize(12).text("CLIENTE:");
    doc.text(`Tienda: ${store.name}`);
    doc.text(`Propietario: ${store.owner.name || "No especificado"}`);
    doc.text(`Email: ${store.owner.email}`);
    doc.text(`Teléfono: ${store.phone || "No especificado"}`);
    doc.moveDown();
    doc.fontSize(14).text("OBJETO DEL CONTRATO:", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(
      "El Prestador otorga al Cliente acceso a la plataforma Mercadito para la gestión de ventas en línea, incluyendo tienda virtual personalizada, gestión de productos y pedidos, sistema de pagos en línea (MercadoPago), panel de administración y soporte técnico básico."
    );
    doc.moveDown();
    doc.fontSize(14).text("COSTO DEL SERVICIO:", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text("$496.00 MXN mensuales (IVA incluido)");
    doc.moveDown();
    doc.fontSize(14).text("AUTORIZACIÓN DE DATOS:", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(
      "El Cliente autoriza expresamente a Mercadito a utilizar su información comercial (nombre de tienda, dirección, teléfono, descripción) para fines de operación de la plataforma, incluyendo mostrar datos de contacto en la tienda virtual, procesar pedidos y entregas, comunicación con clientes e integración con MercadoPago."
    );
    doc.moveDown();
    doc.fontSize(14).text("LIMITACIÓN DE RESPONSABILIDAD:", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(
      "El Prestador NO se hace responsable por: uso indebido de la información pública del vendedor por parte de terceros, disputas entre vendedores y clientes, o pérdidas derivadas del uso de la plataforma. La responsabilidad máxima no excederá el monto pagado por el servicio en el mes correspondiente."
    );
    doc.moveDown(2);
    doc.fontSize(12).text("ACEPTACIÓN:", { underline: true });
    doc.moveDown();
    doc.fontSize(10).text(
      "Al firmar este documento, el Cliente acepta los términos y condiciones establecidos en este contrato."
    );
    doc.moveDown(2);
    doc.fontSize(10).text("DATOS DEL FIRMANTE:");
    doc.text(`Nombre: ${store.owner.name || "No especificado"}`);
    doc.text(`IP: ${ip}`);
    doc.text(`Fecha de aceptación: ${fecha}`);

    doc.end();
  });

  const base64PdfString = base64Pdf.toString("base64");

  if (!store.subscription) {
    await prisma.subscription.create({
      data: {
        storeId: store.id,
        status: "ACTIVE",
        monthlyPriceCents: 49600,
        startDate: today,
        endDate,
        contractSigned: true,
        contractSignedAt: today,
        contractIp: ip,
        contractTerms: contractTerms,
        contractPdfUrl: base64PdfString,
      },
    });
  } else if (store.subscription.status === "TRIAL") {
    await prisma.subscription.update({
      where: { id: store.subscription.id },
      data: {
        status: "ACTIVE",
        monthlyPriceCents: 49600,
        endDate,
        contractSigned: true,
        contractSignedAt: today,
        contractIp: ip,
        contractTerms: contractTerms,
        contractPdfUrl: base64PdfString,
      },
    });
  } else {
    await prisma.subscription.update({
      where: { id: store.subscription.id },
      data: {
        status: "ACTIVE",
        monthlyPriceCents: 49600,
        startDate: today,
        endDate,
        contractSigned: true,
        contractSignedAt: today,
        contractIp: ip,
        contractTerms: contractTerms,
        contractPdfUrl: base64PdfString,
      },
    });
  }

  return Response.json({ ok: true, contractId, pdf: base64PdfString });
}