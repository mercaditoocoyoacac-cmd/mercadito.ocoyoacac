// One-time migration: copy existing Mercado Pago credentials from Store
// to the new StorePaymentMethod model.
// Run: node scripts/migrate-payment-methods.js

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.local" });

const { Pool } = pg;

function decrypt(hex) {
  if (!hex) return null;
  try {
    const buffer = Buffer.from(hex, "hex");
    const base64 = buffer.toString("utf8");
    return Buffer.from(base64, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function encrypt(text) {
  if (!text) return null;
  const buffer = Buffer.from(text);
  const base64 = buffer.toString("base64");
  return Buffer.from(base64).toString("hex");
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const stores = await prisma.store.findMany({
    where: {
      mercadoPagoAccessToken: { not: null },
    },
    select: {
      id: true,
      name: true,
      mercadoPagoAccessToken: true,
      mercadoPagoPublicKey: true,
      mercadoPagoAccountId: true,
      acceptsMercadoPago: true,
      mercadoPagoStatus: true,
    },
  });

  console.log(`Found ${stores.length} stores with Mercado Pago credentials.`);

  let migrated = 0;

  for (const store of stores) {
    const existing = await prisma.storePaymentMethod.findFirst({
      where: { storeId: store.id, processor: "MERCADO_PAGO" },
    });

    if (existing) {
      console.log(`  SKIP ${store.name} - already has payment method record`);
      continue;
    }

    const accessToken = decrypt(store.mercadoPagoAccessToken);
    const publicKey = decrypt(store.mercadoPagoPublicKey);

    if (!accessToken) {
      console.log(`  SKIP ${store.name} - could not decrypt access token`);
      continue;
    }

    const creds = { accessToken };
    if (publicKey) creds.publicKey = publicKey;
    if (store.mercadoPagoAccountId) creds.accountId = store.mercadoPagoAccountId;

    const encrypted = encrypt(JSON.stringify(creds));

    const status = store.mercadoPagoStatus === "APPROVED" ? "APPROVED" : "PENDING";

    await prisma.storePaymentMethod.create({
      data: {
        storeId: store.id,
        processor: "MERCADO_PAGO",
        label: "Mercado Pago",
        credentials: encrypted,
        isActive: store.acceptsMercadoPago,
        status,
      },
    });

    console.log(`  MIGRATED ${store.name} - status: ${status}`);
    migrated++;
  }

  console.log(`\nDone. Migrated ${migrated} stores.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
